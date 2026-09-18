import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';
import { CATS, UNITS } from '../models';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [FormsModule],
  template: `
  @if (svc.itemModal().open) {
    <div class="hs-modal-bg open" (click)="backdrop($event)">
      <div class="hs-modal">
        <div class="hs-modal-h">
          <h3><i class="ti {{ editing ? 'ti-pencil' : 'ti-box' }}"></i> {{ editing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า' }}</h3>
          <button class="hs-modal-x" (click)="svc.closeModals()"><i class="ti ti-x"></i></button>
        </div>
        <div class="hs-form">
          <div class="f full"><label>ชื่อสินค้า</label><input type="text" [(ngModel)]="f.name" placeholder="เช่น โซฟา 3 ที่นั่ง"></div>
          <div class="f full"><label>แบรนด์ / รุ่น (ไม่บังคับ)</label><input type="text" [(ngModel)]="f.brand" placeholder="เช่น IKEA KIVIK"></div>
          <div class="f"><label>ห้อง</label>
            <select [(ngModel)]="f.roomId">@for (r of svc.rooms(); track r.id) {<option [value]="r.id">{{ r.name }}</option>}</select></div>
          <div class="f"><label>หมวดหมู่</label>
            <select [(ngModel)]="f.category">@for (c of cats; track c) {<option [value]="c">{{ c }}</option>}</select></div>
          <div class="f"><label>จำนวน</label><input type="number" min="0" step="1" [(ngModel)]="f.stock"></div>
          <div class="f"><label>หน่วยนับ</label>
            <select [(ngModel)]="f.unit">@for (u of units; track u) {<option [value]="u">{{ u }}</option>}</select></div>
          <div class="f"><label>ราคารวม (ต่อการซื้อ/นำเข้า)</label><input type="number" min="0" step="1" [(ngModel)]="f.price">
            @if (f.price > 0 && f.stock > 0) {<span class="f-hint">≈ {{ perPiece() }} บาท/ชิ้น ({{ f.stock }} ชิ้น)</span>}</div>
          <div class="f"><label>เตือนเมื่อเหลือ ≤</label><input type="number" min="0" step="1" [(ngModel)]="f.min"></div>
          <div class="f full"><label>หมายเหตุ (ไม่บังคับ)</label><textarea [(ngModel)]="f.note" placeholder="เช่น ซื้อที่ไหน / วันหมดอายุ"></textarea></div>
        </div>
        <div class="hs-modal-foot">
          <button class="hs-btn ghost" (click)="svc.closeModals()">ยกเลิก</button>
          <button class="hs-btn primary" (click)="save()"><i class="ti ti-check"></i> บันทึก</button>
        </div>
      </div>
    </div>
  }
  `,
  styles: [`.f-hint{font-size:11.5px;color:var(--hs-green-d);font-weight:600}`],
})
export class ItemFormComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);
  cats = CATS;
  units = UNITS;
  editing = false;
  f = { name: '', brand: '', roomId: '', category: CATS[0], unit: 'ชิ้น', stock: 1, price: 0, min: 0, note: '' };

  constructor() {
    effect(() => {
      const m = this.svc.itemModal();
      if (!m.open) return;
      const it = m.item;
      this.editing = !!it;
      this.f = it
        ? { name: it.name, brand: it.brand || '', roomId: it.roomId, category: it.category || CATS[0], unit: it.unit, stock: it.stock, price: it.price, min: it.min, note: it.note || '' }
        : { name: '', brand: '', roomId: m.roomId || this.svc.rooms()[0]?.id || '', category: CATS[0], unit: 'ชิ้น', stock: 1, price: 0, min: 0, note: '' };
    });
  }

  backdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('hs-modal-bg')) this.svc.closeModals(); }

  perPiece() {
    const q = +this.f.stock || 0;
    const p = +this.f.price || 0;
    return q > 0 ? (p / q).toLocaleString('th-TH', { maximumFractionDigits: 1 }) : '0';
  }

  async save() {
    if (!this.f.name.trim()) return;
    if (!this.svc.rooms().length) { this.toast.error('กรุณาเพิ่มห้องก่อน'); return; }
    const editing = this.editing;
    try {
      await this.svc.saveItem({
        name: this.f.name.trim(),
        brand: this.f.brand.trim(),
        roomId: this.f.roomId,
        category: this.f.category,
        unit: this.f.unit,
        stock: Math.max(0, +this.f.stock || 0),
        price: Math.max(0, +this.f.price || 0),
        min: Math.max(0, +this.f.min || 0),
        note: this.f.note.trim(),
      }, this.svc.itemModal().item?.id);
      this.svc.closeModals();
      this.toast.success(editing ? 'แก้ไขสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว');
    } catch (e: any) {
      this.toast.error('บันทึกไม่สำเร็จ: ' + (e?.code || e?.message || e));
    }
  }
}
