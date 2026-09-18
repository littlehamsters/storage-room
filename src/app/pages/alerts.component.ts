import { Component, computed, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';
import { ItemsPanelComponent } from '../components/items-panel.component';
import { SummaryComponent } from '../components/summary.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [ItemsPanelComponent, SummaryComponent],
  template: `
  <app-summary />
  <app-items-panel [items]="rows()" title="ควรเช็ก / ใกล้หมด" icon="ti-bell" [meta]="meta()" />
  `,
})
export class AlertsComponent {
  svc = inject(InventoryService);
  rows = computed(() => this.svc.items().filter((i) => this.svc.needsRefill(i)));
  meta = computed(() => `${this.rows().length} รายการที่ควรเติมหรือตรวจสอบ`);
}
