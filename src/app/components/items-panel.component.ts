import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';
import { Item } from '../models';

@Component({
  selector: 'app-items-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="hs-panel">
    <div class="hs-panel-h">
      <div class="hs-panel-ic"><i class="ti {{ icon() }}"></i></div>
      <div><div class="hs-panel-tt">{{ title() }}</div><div class="hs-panel-meta" [innerHTML]="meta()"></div></div>
      <div class="hs-panel-actions">
        <button class="hs-btn primary" (click)="add()"><i class="ti ti-plus"></i> เพิ่มสินค้า</button>
        <select class="hs-sort" [ngModel]="sort()" (ngModelChange)="sort.set($event); page.set(1)">
          <option value="recent">จัดเรียง: ล่าสุดที่เพิ่ม</option>
          <option value="name">จัดเรียง: ชื่อ A–Z</option>
          <option value="value-desc">จัดเรียง: มูลค่ามาก→น้อย</option>
          <option value="price-desc">จัดเรียง: ราคามาก→น้อย</option>
          <option value="price-asc">จัดเรียง: ราคาน้อย→มาก</option>
          <option value="qty">จัดเรียง: จำนวนมาก→น้อย</option>
        </select>
        <div class="hs-view-toggle">
          <button [class.on]="viewMode()==='grid'" (click)="viewMode.set('grid')" title="การ์ด"><i class="ti ti-layout-grid"></i></button>
          <button [class.on]="viewMode()==='list'" (click)="viewMode.set('list')" title="ตาราง"><i class="ti ti-list"></i></button>
        </div>
      </div>
    </div>

    <div class="hs-toolbar">
      <div class="hs-inner-search"><i class="ti ti-search"></i>
        <input type="text" placeholder="ค้นหาในห้องนี้…" [ngModel]="term()" (ngModelChange)="term.set($event); page.set(1)"></div>
      <div class="hs-chips">
        <button class="hs-chip" [class.on]="fCat()==='all'" (click)="fCat.set('all'); page.set(1)">ทั้งหมด</button>
        @for (c of chips(); track c) {
          <button class="hs-chip" [class.on]="fCat()===c" (click)="fCat.set(c); page.set(1)">{{ c }}</button>
        }
      </div>
    </div>

    @if (rows().length === 0) {
      <div class="hs-empty"><i class="ti ti-mood-empty"></i>
        <b>ไม่พบรายการ</b>ลองเปลี่ยนหมวดหมู่ ล้างคำค้น หรือกด “เพิ่มสินค้า”</div>
    } @else if (viewMode() === 'list') {
      <div class="hs-twrap"><table class="hs-table">
        <thead><tr>
          <th>สินค้า</th><th>หมวดหมู่</th><th>ห้อง</th>
          <th class="num">จำนวน</th><th class="num">เฉลี่ย/ชิ้น</th><th class="num">ต่ำสุด/ชิ้น</th>
          <th>สถานะ</th><th>หมายเหตุ</th><th></th>
        </tr></thead>
        <tbody>
          @for (it of pageRows(); track it.id) {
            <tr>
              <td><div class="hs-td-prod"><span class="hs-thumb">{{ svc.catEmoji(it.category) }}</span>
                <div><div class="hs-prod-nm">{{ it.name }}</div>@if (it.brand) {<div class="hs-prod-br">{{ it.brand }}</div>}</div></div></td>
              <td>@if (it.category) {<span class="hs-cat-pill {{ svc.catColor(it.category) }}">{{ it.category }}</span>} @else {<span class="hs-mut">-</span>}</td>
              <td class="hs-mut">{{ svc.roomById(it.roomId)?.name || '-' }}</td>
              <td class="num"><b>{{ svc.fmtN(it.stock) }}</b> <span class="hs-mut">{{ it.unit }}</span></td>
              <td class="num">@if (svc.avgPerPiece(it)) {{{ svc.fmtN(svc.avgPerPiece(it)) }}} @else {<span class="hs-mut">-</span>}</td>
              <td class="num"><b>@if (svc.minPerPiece(it) != null) {{{ svc.fmtN(svc.minPerPiece(it)!) }}} @else {<span class="hs-mut" style="font-weight:400">-</span>}</b></td>
              <td><span class="hs-stat-pill {{ svc.status(it) }}">{{ svc.statusLabel(it) }}</span></td>
              <td class="hs-mut">{{ it.note || '-' }}</td>
              <td>
                <div class="hs-row-act">
                  @if (it.stock > 0) {<button class="hs-ib use" title="ใช้ไป 1" (click)="svc.consume(it)"><i class="ti ti-minus"></i></button>}
                  <button class="hs-ib add" title="เติมของ" (click)="svc.openRestock(it)"><i class="ti ti-plus"></i></button>
                  <button class="hs-ib" title="ประวัติการเติม" (click)="svc.openHistory(it)"><i class="ti ti-history"></i></button>
                  <button class="hs-ib" title="แก้ไข" (click)="svc.openItem(it)"><i class="ti ti-pencil"></i></button>
                  <button class="hs-ib del" title="ลบ" (click)="remove(it)"><i class="ti ti-trash"></i></button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table></div>
    } @else {
      <div class="hs-grid">
        @for (it of pageRows(); track it.id) {
          <div class="hs-gcard">
            <div class="hs-gcard-top"><span class="hs-thumb">{{ svc.catEmoji(it.category) }}</span>
              <div><div class="hs-gcard-nm">{{ it.name }}</div>
                <div class="hs-gcard-br">{{ it.brand || svc.roomById(it.roomId)?.name }}</div></div></div>
            @if (it.category) {<span class="hs-cat-pill {{ svc.catColor(it.category) }}" style="align-self:flex-start">{{ it.category }}</span>}
            <div class="hs-gcard-row"><span class="k">จำนวน</span><span><b>{{ svc.fmtN(it.stock) }}</b> {{ it.unit }}</span></div>
            <div class="hs-gcard-row"><span class="k">เฉลี่ย/ชิ้น</span><span>@if (svc.avgPerPiece(it)) {<b>{{ svc.fmtN(svc.avgPerPiece(it)) }}</b> ฿} @else {-}</span></div>
            <div class="hs-gcard-row"><span class="k">ต่ำสุด/ชิ้น</span><span>@if (svc.minPerPiece(it) != null) {<b>{{ svc.fmtN(svc.minPerPiece(it)!) }}</b> ฿} @else {-}</span></div>
            <div class="hs-gcard-foot"><span class="hs-stat-pill {{ svc.status(it) }}">{{ svc.statusLabel(it) }}</span>
              <div class="hs-row-act">
                @if (it.stock > 0) {<button class="hs-ib use" title="ใช้ไป 1" (click)="svc.consume(it)"><i class="ti ti-minus"></i></button>}
                <button class="hs-ib add" (click)="svc.openRestock(it)"><i class="ti ti-plus"></i></button>
                <button class="hs-ib" title="ประวัติการเติม" (click)="svc.openHistory(it)"><i class="ti ti-history"></i></button>
                <button class="hs-ib" (click)="svc.openItem(it)"><i class="ti ti-pencil"></i></button>
                <button class="hs-ib del" (click)="remove(it)"><i class="ti ti-trash"></i></button>
              </div>
            </div>
          </div>
        }
      </div>
    }

    @if (rows().length > 0) {
      <div class="hs-pager">
        <div class="hs-pager-info">แสดง {{ start() + 1 }}–{{ start() + pageRows().length }} จาก {{ rows().length }} รายการ</div>
        @if (totalPages() > 1) {
          <div class="hs-pages">
            <button class="hs-page" [disabled]="clampedPage()===1" (click)="go(clampedPage()-1)"><i class="ti ti-chevron-left"></i></button>
            @for (p of pageList(); track p) {
              <button class="hs-page" [class.on]="p===clampedPage()" (click)="go(p)">{{ p }}</button>
            }
            <button class="hs-page" [disabled]="clampedPage()===totalPages()" (click)="go(clampedPage()+1)"><i class="ti ti-chevron-right"></i></button>
          </div>
        }
      </div>
    }
  </div>
  `,
})
export class ItemsPanelComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);

  items = input.required<Item[]>();
  title = input('');
  icon = input('ti-list');
  meta = input('');
  presetRoomId = input<string | null>(null);

  fCat = signal('all');
  term = signal('');
  sort = signal('recent');
  viewMode = signal<'list' | 'grid'>('list');
  page = signal(1);
  readonly pageSize = 8;

  chips = computed(() => {
    const order = this.svc.catList();
    return [...new Set(this.items().map((i) => i.category).filter(Boolean) as string[])]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  });

  rows = computed(() => {
    let rows = this.items();
    if (this.fCat() !== 'all') rows = rows.filter((i) => (i.category || '') === this.fCat());
    const q = this.term().trim().toLowerCase();
    if (q) rows = rows.filter((i) => {
      const room = this.svc.roomById(i.roomId);
      return (i.name + ' ' + (i.brand || '') + ' ' + (i.category || '') + ' ' + (room?.name || ''))
        .toLowerCase().includes(q);
    });
    const s = this.sort();
    const v = (it: Item) => this.svc.value(it);
    return [...rows].sort((a, b) => {
      switch (s) {
        case 'name': return a.name.localeCompare(b.name, 'th');
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'qty': return (b.stock || 0) - (a.stock || 0);
        case 'value-desc': return v(b) - v(a);
        default: return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.rows().length / this.pageSize)));
  clampedPage = computed(() => Math.min(this.page(), this.totalPages()));
  start = computed(() => (this.clampedPage() - 1) * this.pageSize);
  pageRows = computed(() => this.rows().slice(this.start(), this.start() + this.pageSize));
  pageList = computed(() => {
    const tp = this.totalPages();
    let from = Math.max(1, this.clampedPage() - 2);
    const to = Math.min(tp, from + 4);
    from = Math.max(1, to - 4);
    const out: number[] = [];
    for (let p = from; p <= to; p++) out.push(p);
    return out;
  });

  go(p: number) { this.page.set(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  add() { this.svc.openItem(null, this.presetRoomId() ?? undefined); }
  async remove(it: Item) {
    if (!confirm(`ลบ “${it.name}” ออกจากรายการ?`)) return;
    try { await this.svc.deleteItem(it.id); this.toast.success('ลบสินค้าแล้ว'); }
    catch (e: any) { this.toast.error('ลบไม่สำเร็จ: ' + (e?.code || e?.message || e)); }
  }
}
