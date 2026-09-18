import { Component, computed, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';
import { ItemsPanelComponent } from '../components/items-panel.component';
import { SummaryComponent } from '../components/summary.component';

@Component({
  selector: 'app-all',
  standalone: true,
  imports: [ItemsPanelComponent, SummaryComponent],
  template: `
  <app-summary />
  <app-items-panel [items]="rows()" [title]="title()" [icon]="svc.globalSearch() ? 'ti-search' : 'ti-list-details'" [meta]="meta()" />
  `,
})
export class AllComponent {
  svc = inject(InventoryService);
  rows = computed(() => {
    const q = this.svc.globalSearch().trim().toLowerCase();
    if (!q) return this.svc.items();
    return this.svc.items().filter((i) => {
      const room = this.svc.roomById(i.roomId);
      return (i.name + ' ' + (i.brand || '') + ' ' + (i.category || '') + ' ' + (room?.name || ''))
        .toLowerCase().includes(q);
    });
  });
  title = computed(() => this.svc.globalSearch() ? `ผลการค้นหา “${this.svc.globalSearch()}”` : 'รายการทั้งหมด');
  meta = computed(() => `${this.rows().length} รายการ · มูลค่ารวม <b>${this.svc.fmtB(this.rows().reduce((s, i) => s + this.svc.value(i), 0))} บาท</b>`);
}
