import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { firebaseNotConfigured } from './firebase-config';
import { AuthService } from './auth.service';
import {
  CAT_EMOJI, CATS, Item, LogEntry, Room, StockStatus,
} from './models';

export interface ItemInput {
  name: string; brand: string; roomId: string; category: string;
  unit: string; stock: number; min: number; price: number; note: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  readonly rooms = signal<Room[]>([]);
  readonly items = signal<Item[]>([]);
  readonly customCats = signal<{ id: string; name: string; order?: number }[]>([]);
  readonly ready = signal(false);
  /** signed in but Firestore denied access (not in the allowed group) */
  readonly accessDenied = signal(false);
  readonly notConfigured = firebaseNotConfigured;
  /** true = no Firebase config yet → run fully in-memory (preview mode) */
  private local = firebaseNotConfigured;

  /* ── UI state ── */
  readonly selectedRoomId = signal<string | null>(null);
  readonly globalSearch = signal('');
  readonly itemModal = signal<{ open: boolean; item: Item | null; roomId?: string }>({ open: false, item: null });
  readonly restockModal = signal<{ open: boolean; item: Item | null }>({ open: false, item: null });
  readonly roomModal = signal<{ open: boolean; room: Room | null }>({ open: false, room: null });
  readonly historyModal = signal<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });

  readonly selectedRoom = computed(() =>
    this.rooms().find((r) => r.id === this.selectedRoomId()) ?? this.rooms()[0] ?? null);
  readonly totalValue = computed(() => this.items().reduce((s, i) => s + this.value(i), 0));
  readonly refillCount = computed(() => this.items().filter((i) => this.needsRefill(i)).length);

  private auth = inject(AuthService);

  // ข้อมูลส่วนกลาง (ใช้ร่วมกันทั้งกลุ่ม) — สิทธิ์เข้าถึงคุมด้วย Firestore Rules ตามรายชื่ออีเมล
  private roomsCol = () => collection(db, 'rooms');
  private itemsCol = () => collection(db, 'items');
  private catsCol = () => collection(db, 'categories');
  private roomRef = (id: string) => doc(db, 'rooms', id);
  private itemRef = (id: string) => doc(db, 'items', id);
  private catRef = (id: string) => doc(db, 'categories', id);

  constructor() {
    if (this.local) {
      const s = this.buildSeed();
      this.rooms.set(s.rooms);
      this.items.set(s.items);
      this.selectedRoomId.set(s.rooms[0]?.id ?? null);
      this.ready.set(true);
      return;
    }
    // (re)subscribe to the signed-in user's data whenever the account changes
    effect((onCleanup) => {
      const user = this.auth.user();
      this.accessDenied.set(false);
      if (!user) { this.rooms.set([]); this.items.set([]); this.ready.set(true); return; }
      const onErr = (err: any) => {
        console.error('snapshot', err);
        if (err?.code === 'permission-denied') this.accessDenied.set(true);
        this.ready.set(true);
      };
      const unsubR = onSnapshot(this.roomsCol(), (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, 'id'>) }));
        rooms.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        this.accessDenied.set(false);
        this.rooms.set(rooms);
        if (!this.selectedRoomId() && rooms[0]) this.selectedRoomId.set(rooms[0].id);
        this.ready.set(true);
      }, onErr);
      const unsubI = onSnapshot(this.itemsCol(), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) }));
        items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        this.items.set(items);
      }, onErr);
      // categories: ไม่ block การเข้าถึง (ถ้า rules ยังไม่รองรับก็แค่ว่าง)
      const unsubC = onSnapshot(this.catsCol(), (snap) => {
        const cats = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { name: string; order?: number }) }));
        cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        this.customCats.set(cats);
      }, (err) => console.warn('categories snapshot', err?.code || err));
      onCleanup(() => { unsubR(); unsubI(); unsubC(); });
    });
  }

  /* ═══ Derived helpers (used in templates) ═══ */
  // price = ราคารวมต่อการนำเข้า/ซื้อ (มูลค่ารวมของรายการนั้น)
  value = (it: Item) => (+it.price || 0);
  // เฉลี่ยต่อชิ้น = ราคารวม ÷ จำนวน
  unitPrice = (it: Item) => { const q = +it.stock || 0; return q > 0 ? (+it.price || 0) / q : 0; };
  // ราคาเฉลี่ยต่อชิ้นจากประวัติการเติม (ถ่วงน้ำหนัก) ถ้าไม่มีประวัติใช้ unitPrice
  avgPerPiece = (it: Item) => {
    const log = it.log ?? [];
    const q = log.reduce((s, l) => s + (+l.qty || 0), 0);
    const spent = log.reduce((s, l) => s + (+(l.price || 0)), 0);
    return q > 0 && spent > 0 ? spent / q : this.unitPrice(it);
  };
  // ราคาต่อชิ้นที่ถูกที่สุดที่เคยซื้อ (จากประวัติ) — null ถ้าไม่มีข้อมูล
  minPerPiece = (it: Item): number | null => {
    const v = (it.log ?? [])
      .filter((l) => (l.price || 0) > 0 && (l.qty || 0) > 0)
      .map((l) => (l.price as number) / l.qty);
    return v.length ? Math.min(...v) : null;
  };
  status(it: Item): StockStatus {
    if (!it.min) return 'ok';
    if (it.stock <= 0) return 'out';
    if (it.stock <= it.min) return 'low';
    return 'ok';
  }
  statusLabel = (it: Item) => ({ ok: 'ปกติ', low: 'ใกล้หมด', out: 'หมดแล้ว' })[this.status(it)];
  needsRefill = (it: Item) => it.min > 0 && it.stock <= it.min;

  catList(): string[] {
    const names = new Set<string>(CATS);
    this.customCats().forEach((c) => names.add(c.name));
    this.items().forEach((i) => { if (i.category) names.add(i.category); });
    const rest = [...names].filter((n) => !CATS.includes(n)).sort((a, b) => a.localeCompare(b, 'th'));
    return [...CATS, ...rest];
  }
  isCustomCat = (name: string) => this.customCats().some((c) => c.name === name);

  async addCategory(name: string) {
    const n = name.trim();
    if (!n) return;
    if (this.catList().some((c) => c.toLowerCase() === n.toLowerCase())) throw new Error('มีหมวดนี้อยู่แล้ว');
    if (this.local) { this.customCats.update((a) => [...a, { id: this.genId(), name: n, order: a.length }]); return; }
    await addDoc(this.catsCol(), { name: n, order: this.customCats().length });
  }
  async deleteCategory(id: string) {
    if (this.local) { this.customCats.update((a) => a.filter((c) => c.id !== id)); return; }
    await deleteDoc(this.catRef(id));
  }
  catColor = (c?: string) => 'cat-c' + (((this.catList().indexOf(c ?? '') % 8) + 8) % 8);
  catEmoji = (c?: string) => CAT_EMOJI[c ?? ''] || '📦';

  fmtN = (n: number) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 });
  fmtB = (n: number) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

  itemsInRoom = (roomId: string) => this.items().filter((i) => i.roomId === roomId);
  roomById = (id: string) => this.rooms().find((r) => r.id === id) ?? null;

  private genId = () => Math.random().toString(36).slice(2, 10);

  /* ═══ Item CRUD ═══ */
  async saveItem(data: ItemInput, id?: string | null) {
    if (this.local) {
      if (id) this.items.update((a) => a.map((i) => (i.id === id ? { ...i, ...data } : i)));
      else { this.items.update((a) => [{ id: this.genId(), log: [], createdAt: Date.now(), ...data }, ...a]); this.selectedRoomId.set(data.roomId); }
      return;
    }
    if (id) await updateDoc(this.itemRef(id), { ...data });
    else { await addDoc(this.itemsCol(), { ...data, log: [], createdAt: Date.now() }); this.selectedRoomId.set(data.roomId); }
  }
  async deleteItem(id: string) {
    if (this.local) { this.items.update((a) => a.filter((i) => i.id !== id)); return; }
    await deleteDoc(this.itemRef(id));
  }
  async consume(it: Item) {
    if (it.stock <= 0) return;
    const stock = Math.max(0, +(it.stock - 1).toFixed(2));
    if (this.local) { this.items.update((a) => a.map((i) => (i.id === it.id ? { ...i, stock } : i))); return; }
    await updateDoc(this.itemRef(it.id), { stock });
  }
  async restock(it: Item, entry: LogEntry) {
    // entry.price = ราคารวมของการเติมครั้งนี้ → บวกสะสมเข้ากับมูลค่ารวม
    const log = [...(it.log ?? []), entry];
    const stock = +(it.stock + entry.qty).toFixed(2);
    const price = +((+it.price || 0) + (entry.price || 0)).toFixed(2);
    if (this.local) { this.items.update((a) => a.map((i) => (i.id === it.id ? { ...i, log, stock, price } : i))); return; }
    await updateDoc(this.itemRef(it.id), { log, stock, price } as any);
  }

  /* ═══ Room CRUD ═══ */
  async saveRoom(name: string, icon: string, id?: string | null) {
    if (this.local) {
      if (id) this.rooms.update((a) => a.map((r) => (r.id === id ? { ...r, name, icon } : r)));
      else { const room = { id: this.genId(), name, icon, order: this.rooms().length }; this.rooms.update((a) => [...a, room]); this.selectedRoomId.set(room.id); }
      return;
    }
    if (id) await updateDoc(this.roomRef(id), { name, icon });
    else { const ref = await addDoc(this.roomsCol(), { name, icon, order: this.rooms().length }); this.selectedRoomId.set(ref.id); }
  }
  async deleteRoom(id: string) {
    if (this.local) {
      this.items.update((a) => a.filter((i) => i.roomId !== id));
      this.rooms.update((a) => a.filter((r) => r.id !== id));
      if (this.selectedRoomId() === id) this.selectedRoomId.set(this.rooms()[0]?.id ?? null);
      return;
    }
    await Promise.all(this.itemsInRoom(id).map((i) => deleteDoc(this.itemRef(i.id))));
    await deleteDoc(this.roomRef(id));
    if (this.selectedRoomId() === id) this.selectedRoomId.set(this.rooms()[0]?.id ?? null);
  }

  /* ═══ Modal helpers ═══ */
  openItem(item: Item | null, roomId?: string) { this.itemModal.set({ open: true, item, roomId }); }
  openRestock(item: Item) { this.restockModal.set({ open: true, item }); }
  openRoom(room: Room | null) { this.roomModal.set({ open: true, room }); }
  openHistory(item: Item) { this.historyModal.set({ open: true, itemId: item.id }); }
  closeModals() {
    this.itemModal.set({ open: false, item: null });
    this.restockModal.set({ open: false, item: null });
    this.roomModal.set({ open: false, room: null });
    this.historyModal.set({ open: false, itemId: null });
  }

  /* ═══ Backup / restore ═══ */
  exportData() {
    return { version: 3, created: new Date().toISOString(), note: 'ห้องเก็บของ backup', rooms: this.rooms(), items: this.items() };
  }
  async importData(data: any) {
    const rooms: Room[] = data?.rooms || [];
    const items: Item[] = data?.items || [];
    if (!rooms.length && !items.length) throw new Error('ไม่พบข้อมูลในไฟล์');
    if (this.local) {
      this.rooms.set(rooms.map((r, i) => ({ ...r, order: r.order ?? i })));
      this.items.set(items);
      this.selectedRoomId.set(rooms[0]?.id ?? null);
      return;
    }
    await Promise.all(this.items().map((i) => deleteDoc(this.itemRef(i.id))));
    await Promise.all(this.rooms().map((r) => deleteDoc(this.roomRef(r.id))));
    const idMap: Record<string, string> = {};
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const ref = await addDoc(this.roomsCol(), { name: r.name, icon: r.icon, order: r.order ?? i });
      idMap[r.id] = ref.id;
    }
    let t = Date.now();
    for (const it of items) {
      const { id, ...rest } = it;
      await addDoc(this.itemsCol(), { ...rest, roomId: idMap[it.roomId] || it.roomId, createdAt: it.createdAt ?? t-- });
    }
  }

  /* ═══ Demo seed ═══ */
  private buildSeed(): { rooms: Room[]; items: Item[] } {
    const roomDefs: [string, string, string][] = [
      ['living', 'ห้องนั่งเล่น', 'ti-sofa'], ['bed', 'ห้องนอน', 'ti-bed'],
      ['kitchen', 'ห้องครัว', 'ti-tools-kitchen-2'], ['bath', 'ห้องน้ำ', 'ti-bath'],
      ['dining', 'ห้องรับประทานอาหาร', 'ti-tools-kitchen-3'], ['hall', 'ห้องทางเดิน', 'ti-stairs'],
      ['balcony', 'ระเบียง', 'ti-plant-2'],
    ];
    const rooms: Room[] = [];
    const ids: Record<string, string> = {};
    roomDefs.forEach(([key, name, icon], i) => { const id = this.genId(); ids[key] = id; rooms.push({ id, name, icon, order: i }); });
    const ago = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().slice(0, 10); };
    type S = [string, string, string, string, string, number, number, number, LogEntry[]?];
    const rows: S[] = [
      ['โซฟา 3 ที่นั่ง', 'IKEA KIVIK', 'living', 'เฟอร์นิเจอร์', 'ตัว', 1, 25900, 0],
      ['ทีวี 55 นิ้ว', 'Samsung QLED', 'living', 'เครื่องใช้ไฟฟ้า', 'เครื่อง', 1, 18900, 0],
      ['โต๊ะกลาง', 'SB Design', 'living', 'เฟอร์นิเจอร์', 'ตัว', 1, 4500, 0],
      ['โคมไฟตั้งพื้น', 'IKEA NOT', 'living', 'ของตกแต่ง', 'อัน', 1, 2490, 0],
      ['พรม', 'HomePro', 'living', 'ของใช้ทั่วไป', 'ผืน', 1, 1290, 0],
      ['ต้นไม้ปลอม', 'IKEA FEJKA', 'living', 'ของตกแต่ง', 'ต้น', 2, 590, 0],
      ['เครื่องฟอกอากาศ', 'Xiaomi', 'living', 'เครื่องใช้ไฟฟ้า', 'เครื่อง', 1, 4990, 0],
      ['เตียง 6 ฟุต', 'Index', 'bed', 'เฟอร์นิเจอร์', 'ชุด', 1, 15900, 0],
      ['ที่นอน', 'Omazz', 'bed', 'เฟอร์นิเจอร์', 'ชิ้น', 1, 21900, 0],
      ['ตู้เสื้อผ้า', 'IKEA PAX', 'bed', 'เฟอร์นิเจอร์', 'ตู้', 1, 8900, 0],
      ['หม้อหุงข้าว', 'Panasonic', 'kitchen', 'เครื่องใช้ไฟฟ้า', 'เครื่อง', 1, 1590, 0],
      ['ไมโครเวฟ', 'Sharp', 'kitchen', 'เครื่องใช้ไฟฟ้า', 'เครื่อง', 1, 2790, 0],
      ['น้ำมันพืช', 'มรกต', 'kitchen', 'เครื่องปรุง', 'ขวด', 2, 65, 2, [{ date: ago(70), qty: 3, price: 65 }, { date: ago(30), qty: 3, price: 65 }]],
      ['ข้าวสาร 5 กก.', 'หงษ์ทอง', 'kitchen', 'ของแห้ง', 'ถุง', 3, 220, 1, [{ date: ago(60), qty: 2, price: 220 }]],
      ['กระดาษทิชชู่', 'Scott', 'bath', 'ของใช้ทั่วไป', 'ม้วน', 4, 18, 6, [{ date: ago(45), qty: 12, price: 18 }]],
      ['สบู่เหลว', 'Protex', 'bath', 'ทำความสะอาด', 'ขวด', 1, 89, 2, [{ date: ago(50), qty: 2, price: 89 }]],
      ['ยาสีฟัน', 'Colgate', 'bath', 'ของใช้ทั่วไป', 'หลอด', 3, 45, 2],
      ['โต๊ะอาหาร 6 ที่นั่ง', 'Koncept', 'dining', 'เฟอร์นิเจอร์', 'ชุด', 1, 12900, 0],
      ['น้ำยาถูพื้น', 'Magiclean', 'hall', 'ทำความสะอาด', 'ขวด', 0, 79, 1, [{ date: ago(40), qty: 2, price: 79 }]],
      ['กระถางต้นไม้', 'HomePro', 'balcony', 'ของตกแต่ง', 'ใบ', 4, 350, 0],
    ];
    let t = Date.now();
    // seed authored as ราคา/ชิ้น → เก็บเป็นราคารวม (× จำนวน) ตามความหมายใหม่
    const items: Item[] = rows.map(([name, brand, key, category, unit, stock, unitP, min, log]) => ({
      id: this.genId(), name, brand, roomId: ids[key], category, unit, stock,
      price: unitP * (stock || 1), min, note: '', log: log ?? [], createdAt: t--,
    }));
    return { rooms, items };
  }

  async seedDemo() {
    const s = this.buildSeed();
    if (this.local) {
      this.rooms.set(s.rooms); this.items.set(s.items); this.selectedRoomId.set(s.rooms[0]?.id ?? null);
      return;
    }
    await Promise.all(this.items().map((i) => deleteDoc(this.itemRef(i.id))));
    await Promise.all(this.rooms().map((r) => deleteDoc(this.roomRef(r.id))));
    const idMap: Record<string, string> = {};
    for (const r of s.rooms) { const ref = await addDoc(this.roomsCol(), { name: r.name, icon: r.icon, order: r.order }); idMap[r.id] = ref.id; }
    let t = Date.now();
    for (const it of s.items) {
      const { id, ...rest } = it;
      await addDoc(this.itemsCol(), { ...rest, roomId: idMap[it.roomId], createdAt: t-- });
    }
    this.selectedRoomId.set(idMap[s.rooms[0].id]);
  }
}
