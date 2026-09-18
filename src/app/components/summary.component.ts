import { Component, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  template: `
  <div class="hs-summary">
    <div class="hs-sum"><div class="hs-sum-ic blue"><i class="ti ti-package"></i></div>
      <div><div class="hs-sum-l">รายการทั้งหมด</div><div class="hs-sum-n">{{ svc.fmtB(svc.items().length) }}<small>รายการ</small></div></div></div>
    <div class="hs-sum"><div class="hs-sum-ic"><i class="ti ti-coins"></i></div>
      <div><div class="hs-sum-l">มูลค่ารวม (ประมาณ)</div><div class="hs-sum-n">{{ svc.fmtB(svc.totalValue()) }}<small>บาท</small></div></div></div>
    <div class="hs-sum"><div class="hs-sum-ic warn"><i class="ti ti-alert-triangle"></i></div>
      <div><div class="hs-sum-l">ควรเช็ก / ใกล้หมด</div><div class="hs-sum-n">{{ svc.fmtB(svc.refillCount()) }}<small>รายการ</small></div></div></div>
  </div>
  `,
})
export class SummaryComponent {
  svc = inject(InventoryService);
}
