import { Component, computed, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';

@Component({
  selector: 'app-history',
  standalone: true,
  template: `
  @if (svc.historyModal().open && item(); as it) {
    <div class="hs-modal-bg open" (click)="backdrop($event)">
      <div class="hs-modal">
        <div class="hs-modal-h">
          <h3><i class="ti ti-history"></i> ประวัติการเติม</h3>
          <button class="hs-modal-x" (click)="svc.closeModals()"><i class="ti ti-x"></i></button>
        </div>
        <div class="hs-rs-info"><b>{{ it.name }}</b> · {{ svc.roomById(it.roomId)?.name }} · เหลือ {{ svc.fmtN(it.stock) }} {{ it.unit }}</div>

        <div class="hh-sum">
          <div><span class="hh-k">เติมทั้งหมด</span><span class="hh-v">{{ svc.fmtN(totalQty()) }} {{ it.unit }}</span></div>
          <div><span class="hh-k">จำนวนครั้ง</span><span class="hh-v">{{ rows().length }} ครั้ง</span></div>
          <div><span class="hh-k">เฉลี่ย/เดือน</span><span class="hh-v">{{ svc.fmtB(avgPerMonth()) }} บาท</span></div>
        </div>

        @if (rows().length) {
          <div class="hh-list">
            <div class="hh-row hh-head"><span>วันที่</span><span class="num">จำนวน</span><span class="num">ราคารวม</span><span class="num">/ชิ้น</span></div>
            @for (l of rows(); track $index) {
              <div class="hh-row">
                <span><i class="ti ti-calendar-plus"></i> {{ fmtDate(l.date) }}</span>
                <span class="num">+{{ svc.fmtN(l.qty) }}</span>
                <span class="num">{{ l.price ? svc.fmtB(l.price) : '-' }}</span>
                <span class="num hs-mut">{{ l.price && l.qty ? svc.fmtN(l.price / l.qty) : '-' }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="hs-empty" style="padding:34px 20px"><i class="ti ti-clock-off"></i>
            <b>ยังไม่มีประวัติการเติม</b>กดปุ่ม ＋ เพื่อบันทึกการเติมครั้งแรก</div>
        }

        <div class="hs-modal-foot">
          <button class="hs-btn ghost" (click)="svc.closeModals()">ปิด</button>
          <button class="hs-btn primary" (click)="svc.openRestock(it)"><i class="ti ti-plus"></i> เติมของ</button>
        </div>
      </div>
    </div>
  }
  `,
  styles: [`
    .hh-sum{display:flex;gap:10px;margin:14px 22px 4px}
    .hh-sum>div{flex:1;background:var(--hs-bg);border:1px solid var(--hs-line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:3px}
    .hh-k{font-size:11.5px;color:var(--hs-ink3)}
    .hh-v{font-size:16px;font-weight:700;color:var(--hs-ink);font-variant-numeric:tabular-nums}
    .hh-list{margin:14px 22px 4px;border:1px solid var(--hs-line);border-radius:12px;overflow:hidden}
    .hh-row{display:grid;grid-template-columns:1.6fr 1fr 1fr .9fr;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--hs-line);font-size:13.5px}
    .hh-row:last-child{border-bottom:none}
    .hh-row .num{text-align:right;font-variant-numeric:tabular-nums}
    .hh-row i{font-size:15px;color:var(--hs-green-d);margin-right:5px}
    .hh-head{background:var(--hs-bg);font-size:12px;font-weight:600;color:var(--hs-ink3)}
    .hh-head i{display:none}
  `],
})
export class HistoryComponent {
  svc = inject(InventoryService);

  item = computed(() => this.svc.items().find((i) => i.id === this.svc.historyModal().itemId) ?? null);
  rows = computed(() => [...(this.item()?.log ?? [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  totalQty = computed(() => this.rows().reduce((s, l) => s + (+l.qty || 0), 0));
  totalSpent = computed(() => this.rows().reduce((s, l) => s + (+(l.price || 0)), 0));
  // เฉลี่ยค่าใช้จ่ายต่อเดือน = ยอดรวม ÷ จำนวนเดือนจากการเติมครั้งแรกถึงครั้งล่าสุด
  avgPerMonth = computed(() => {
    const dates = this.rows().map((l) => new Date(l.date).getTime()).filter((t) => !isNaN(t));
    if (!dates.length) return 0;
    const months = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 30.44));
    return this.totalSpent() / months;
  });

  backdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('hs-modal-bg')) this.svc.closeModals(); }
  fmtDate(iso: string) {
    const d = new Date(iso);
    return isNaN(+d) ? iso : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  }
}
