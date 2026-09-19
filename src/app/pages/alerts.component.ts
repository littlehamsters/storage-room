import { Component, computed, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';
import { ItemsPanelComponent } from '../components/items-panel.component';
import { SummaryComponent } from '../components/summary.component';
import { Item } from '../models';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [ItemsPanelComponent, SummaryComponent],
  template: `
  <app-summary />
  <div class="al-bar">
    <button class="hs-btn ghost" [disabled]="!rows().length" (click)="exportImage()">
      <i class="ti ti-photo-down"></i> Export รูปรายการซื้อ
    </button>
  </div>
  <app-items-panel [items]="rows()" title="ควรเช็ก / ใกล้หมด" icon="ti-bell" [meta]="meta()" />
  `,
  styles: [`.al-bar{display:flex;justify-content:flex-end;margin-bottom:12px}`],
})
export class AlertsComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);

  rows = computed(() => this.svc.items().filter((i) => this.svc.needsRefill(i)));
  meta = computed(() => `${this.rows().length} รายการที่ควรเติมหรือตรวจสอบ`);

  private buyQty(it: Item): number {
    return Math.max(1, Math.ceil((it.min || 1) - it.stock));
  }
  private clip(ctx: CanvasRenderingContext2D, text: string, max: number): string {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t + '…';
  }

  async exportImage() {
    const items = this.rows();
    if (!items.length) { this.toast.error('ไม่มีรายการที่ควรซื้อ'); return; }
    const F = "'IBM Plex Sans Thai', 'Inter', sans-serif";
    try {
      const fonts = (document as any).fonts;
      if (fonts) { await fonts.load(`700 22px ${F}`); await fonts.load(`500 14px ${F}`); await fonts.ready; }
    } catch { /* ignore */ }

    const data = items.map((it) => ({
      name: it.name, room: this.svc.roomById(it.roomId)?.name || '',
      unit: it.unit, stock: it.stock, min: it.min,
      buy: this.buyQty(it), avg: this.svc.avgPerPiece(it), low: this.svc.minPerPiece(it),
    }));

    /* ── กระดาษปกติ (มินิมอล) ── */
    const S = 2, W = 440, mx = 32;
    const ink = '#242f29', mut = '#9aa39d', green = '#2f9e6b';
    const rowH = 60, itemsTop = 110;
    const totalTop = itemsTop + data.length * rowH + 8;
    const H = totalTop + 104;

    const cv = document.createElement('canvas');
    cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d')!;
    ctx.scale(S, S);

    // paper
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#edf0ee'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // header
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = ink; ctx.font = `500 20px ${F}`;
    ctx.fillText('รายการที่ควรซื้อ', mx, 50);
    ctx.fillStyle = mut; ctx.font = `400 13px ${F}`;
    const now = new Date();
    const dstr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(`${data.length} รายการ · ${dstr}`, mx, 72);
    ctx.strokeStyle = '#eef1ef'; ctx.beginPath(); ctx.moveTo(mx, 90); ctx.lineTo(W - mx, 90); ctx.stroke();

    // items — 2 columns, airy, no per-row lines
    let est = 0;
    data.forEach((r, i) => {
      const bt = itemsTop + i * rowH;
      // right column first (measure to clip name)
      ctx.textAlign = 'right';
      ctx.fillStyle = ink; ctx.font = `500 14px ${F}`;
      const qty = `${this.svc.fmtN(r.buy)} ${r.unit}`;
      ctx.fillText(qty, W - mx, bt + 4);
      ctx.fillStyle = mut; ctx.font = `400 12px ${F}`;
      const price = `เฉลี่ย ${r.avg ? this.svc.fmtN(r.avg) : '-'}  ·  ถูกสุด ${r.low != null ? this.svc.fmtN(r.low) : '-'} ฿/ชิ้น`;
      ctx.fillText(price, W - mx, bt + 24);
      const rightW = Math.max(ctx.measureText(price).width, ctx.measureText(qty).width);
      // left column
      ctx.textAlign = 'left';
      ctx.fillStyle = ink; ctx.font = `500 15px ${F}`;
      ctx.fillText(this.clip(ctx, r.name, W - 2 * mx - rightW - 18), mx, bt + 4);
      ctx.fillStyle = mut; ctx.font = `400 12px ${F}`;
      ctx.fillText(r.room, mx, bt + 24);

      est += r.buy * (r.low ?? r.avg ?? 0);
    });

    // total
    ctx.strokeStyle = '#eef1ef'; ctx.beginPath(); ctx.moveTo(mx, totalTop); ctx.lineTo(W - mx, totalTop); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = mut; ctx.font = `400 13px ${F}`;
    ctx.fillText('รวมโดยประมาณ (จากราคาถูกสุด)', mx, totalTop + 34);
    ctx.textAlign = 'right'; ctx.fillStyle = green; ctx.font = `500 26px ${F}`;
    ctx.fillText(`~${this.svc.fmtB(est)} ฿`, W - mx, totalTop + 40);
    ctx.textAlign = 'center'; ctx.fillStyle = '#b3bab5'; ctx.font = `400 11px ${F}`;
    ctx.fillText('สร้างจากแอปห้องเก็บของ', W / 2, totalTop + 78);

    cv.toBlob((blob) => {
      if (!blob) { this.toast.error('สร้างรูปไม่สำเร็จ'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shopping_' + new Date().toISOString().slice(0, 10) + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
      this.toast.success('บันทึกรูปรายการซื้อแล้ว');
    }, 'image/png');
  }
}
