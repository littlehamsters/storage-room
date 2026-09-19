import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="hs-hero">
    <div class="hs-hello">
      <div class="hs-hello-t">หมวดหมู่</div>
      <div class="hs-hello-s">ดูของในบ้านแยกตามประเภท · เพิ่มหมวดหมู่ของคุณเองได้</div>
    </div>
    <button class="hs-btn primary" (click)="toggleAdd()"><i class="ti ti-plus"></i> เพิ่มหมวดหมู่</button>
  </div>

  @if (adding()) {
    <div class="cat-addbar">
      <input type="text" placeholder="ชื่อหมวดหมู่ใหม่ เช่น ของสัตว์เลี้ยง" [(ngModel)]="name"
        (keydown.enter)="add()" (keydown.escape)="cancel()" #inp>
      <button class="hs-btn primary" (click)="add()"><i class="ti ti-check"></i> บันทึก</button>
      <button class="hs-btn ghost" (click)="cancel()">ยกเลิก</button>
    </div>
  }

  @if (cards().length) {
    <div class="hs-catgrid">
      @for (c of cards(); track c.name) {
        <div class="hs-catcard-wrap">
          <button class="hs-catcard" (click)="open(c.name)">
            <div class="hs-catcard-ic {{ svc.catColor(c.name) }}">{{ svc.catEmoji(c.name) }}</div>
            <div class="hs-catcard-nm">{{ c.name }}</div>
            <div class="hs-catcard-meta">{{ c.count }} รายการ</div>
            <div class="hs-catcard-val">{{ svc.fmtB(c.value) }} บาท</div>
          </button>
          @if (c.custom) {
            <button class="cat-del" title="ลบหมวดหมู่" (click)="del(c.id!, c.name, c.count)"><i class="ti ti-trash"></i></button>
          }
        </div>
      }
    </div>
  } @else {
    <div class="hs-panel"><div class="hs-empty"><i class="ti ti-tag"></i>
      <b>ยังไม่มีหมวดหมู่</b>กด “เพิ่มหมวดหมู่” หรือเพิ่มสินค้าแล้วเลือกหมวดหมู่</div></div>
  }
  `,
  styles: [`
    .cat-addbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;background:var(--hs-surface);border:1px solid var(--hs-line);
      border-radius:14px;padding:14px 16px;box-shadow:var(--hs-shadow)}
    .cat-addbar input{flex:1;min-width:200px;height:44px;border:1px solid var(--hs-line2);border-radius:11px;padding:0 13px;
      font-family:inherit;font-size:14px;color:var(--hs-ink);background:var(--hs-surface);outline:none}
    .cat-addbar input:focus{border-color:var(--hs-green);box-shadow:0 0 0 3px var(--hs-green-ring)}
    .hs-catcard-wrap{position:relative}
    .hs-catcard-wrap .hs-catcard{width:100%}
    .cat-del{position:absolute;top:12px;right:12px;width:32px;height:32px;border:none;background:var(--hs-bg);border-radius:9px;
      color:var(--hs-ink3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.14s}
    .cat-del:hover{background:var(--hs-danger-soft);color:var(--hs-danger)}
    .cat-del i{font-size:16px}
  `],
})
export class CategoriesComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);
  private router = inject(Router);

  adding = signal(false);
  name = '';

  cards = computed(() => this.svc.catList()
    .map((nm) => {
      const its = this.svc.items().filter((i) => i.category === nm);
      const custom = this.svc.customCats().find((c) => c.name === nm);
      return { name: nm, count: its.length, value: its.reduce((s, i) => s + this.svc.value(i), 0), custom: !!custom, id: custom?.id };
    })
    // แสดงเฉพาะหมวดที่มีของ หรือหมวดที่สร้างเองไว้ (แม้ยังไม่มีของ)
    .filter((c) => c.count > 0 || c.custom));

  toggleAdd() { this.adding.update((v) => !v); this.name = ''; }
  cancel() { this.adding.set(false); this.name = ''; }

  async add() {
    const n = this.name.trim();
    if (!n) return;
    try {
      await this.svc.addCategory(n);
      this.toast.success('เพิ่มหมวดหมู่แล้ว');
      this.name = '';
      this.adding.set(false);
    } catch (e: any) {
      this.toast.error(e?.message || ('เพิ่มไม่สำเร็จ: ' + (e?.code || e)));
    }
  }

  async del(id: string, name: string, count: number) {
    const warn = count > 0
      ? `ลบหมวด “${name}”? (สินค้า ${count} ชิ้นจะยังอยู่ แต่หมวดจะหายจากรายการที่เลือกได้)`
      : `ลบหมวด “${name}”?`;
    if (!confirm(warn)) return;
    try { await this.svc.deleteCategory(id); this.toast.success('ลบหมวดหมู่แล้ว'); }
    catch (e: any) { this.toast.error('ลบไม่สำเร็จ: ' + (e?.code || e?.message || e)); }
  }

  open(name: string) {
    this.svc.globalSearch.set(name);
    this.router.navigate(['/all']);
  }
}
