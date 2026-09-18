import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-restock',
  standalone: true,
  imports: [FormsModule],
  template: `
  @if (svc.restockModal().open && svc.restockModal().item; as it) {
    <div class="hs-modal-bg open" (click)="backdrop($event)">
      <div class="hs-modal sm">
        <div class="hs-modal-h">
          <h3><i class="ti ti-plus"></i> เติมของ</h3>
          <button class="hs-modal-x" (click)="svc.closeModals()"><i class="ti ti-x"></i></button>
        </div>
        <div class="hs-rs-info"><b>{{ it.name }}</b> · {{ svc.roomById(it.roomId)?.name }} · เหลือ {{ svc.fmtN(it.stock) }} {{ it.unit }}</div>
        <div class="hs-form">
          <div class="f"><label>จำนวนที่เติม</label><input type="number" min="1" step="1" [(ngModel)]="f.qty"></div>
          <div class="f"><label>ราคารวมครั้งนี้ (บาท)</label><input type="number" min="0" step="1" [(ngModel)]="f.price"></div>
          <div class="f full"><label>วันที่เติม</label><input type="date" [(ngModel)]="f.date"></div>
        </div>
        <div class="hs-modal-foot">
          <button class="hs-btn ghost" (click)="svc.closeModals()">ยกเลิก</button>
          <button class="hs-btn primary" (click)="save()"><i class="ti ti-check"></i> เติมของ</button>
        </div>
      </div>
    </div>
  }
  `,
})
export class RestockComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);
  f = { qty: 1, price: 0, date: new Date().toISOString().slice(0, 10) };

  constructor() {
    effect(() => {
      const m = this.svc.restockModal();
      if (!m.open || !m.item) return;
      this.f = { qty: Math.max(1, m.item.min || 1), price: 0, date: new Date().toISOString().slice(0, 10) };
    });
  }

  backdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('hs-modal-bg')) this.svc.closeModals(); }

  async save() {
    const it = this.svc.restockModal().item;
    if (!it) return;
    const qty = +this.f.qty || 0;
    if (qty <= 0) return;
    try {
      await this.svc.restock(it, { qty, price: Math.max(0, +this.f.price || 0), date: this.f.date || new Date().toISOString().slice(0, 10) });
      this.svc.closeModals();
      this.toast.success('เติมของแล้ว');
    } catch (e: any) {
      this.toast.error('บันทึกไม่สำเร็จ: ' + (e?.code || e?.message || e));
    }
  }
}
