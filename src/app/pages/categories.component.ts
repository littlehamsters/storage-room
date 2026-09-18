import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  template: `
  <div class="hs-hero"><div class="hs-hello">
    <div class="hs-hello-t">หมวดหมู่</div>
    <div class="hs-hello-s">ดูของในบ้านแยกตามประเภท</div></div></div>

  @if (cats().length) {
    <div class="hs-catgrid">
      @for (c of cats(); track c.name) {
        <button class="hs-catcard" (click)="open(c.name)">
          <div class="hs-catcard-ic {{ svc.catColor(c.name) }}">{{ svc.catEmoji(c.name) }}</div>
          <div class="hs-catcard-nm">{{ c.name }}</div>
          <div class="hs-catcard-meta">{{ c.count }} รายการ</div>
          <div class="hs-catcard-val">{{ svc.fmtB(c.value) }} บาท</div>
        </button>
      }
    </div>
  } @else {
    <div class="hs-panel"><div class="hs-empty"><i class="ti ti-tag"></i>
      <b>ยังไม่มีหมวดหมู่</b>เพิ่มสินค้าแล้วเลือกหมวดหมู่ให้แต่ละชิ้น</div></div>
  }
  `,
})
export class CategoriesComponent {
  svc = inject(InventoryService);
  private router = inject(Router);

  cats = computed(() => this.svc.catList()
    .map((name) => {
      const its = this.svc.items().filter((i) => i.category === name);
      return { name, count: its.length, value: its.reduce((s, i) => s + this.svc.value(i), 0) };
    })
    .filter((c) => c.count > 0));

  open(name: string) {
    this.svc.globalSearch.set(name);
    this.router.navigate(['/all']);
  }
}
