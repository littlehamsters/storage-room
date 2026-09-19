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

  private avgPerPiece(it: Item): number {
    const log = it.log ?? [];
    const q = log.reduce((s, l) => s + (+l.qty || 0), 0);
    const spent = log.reduce((s, l) => s + (+(l.price || 0)), 0);
    if (q > 0 && spent > 0) return spent / q;
    return this.svc.unitPrice(it);
  }
  private minPerPiece(it: Item): number | null {
    const v = (it.log ?? [])
      .filter((l) => (l.price || 0) > 0 && (l.qty || 0) > 0)
      .map((l) => (l.price as number) / l.qty);
    return v.length ? Math.min(...v) : null;
  }
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
      buy: this.buyQty(it), avg: this.avgPerPiece(it), low: this.minPerPiece(it),
    }));

    /* ── การ์ดแนวตั้ง (portrait) ── */
    const S = 2, W = 460, mx = 20, pad = 16;
    const headH = 96, itemsTop = headH + 18, blockH = 86, gap = 12, footH = 108;
    const H = itemsTop + data.length * (blockH + gap) + footH;
    const cv = document.createElement('canvas');
    cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d')!;
    ctx.scale(S, S);
    const rrect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if ((ctx as any).roundRect) (ctx as any).roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    };

    // background + header
    ctx.fillStyle = '#eef2f0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2f9e6b'; ctx.fillRect(0, 0, W, headH);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff'; ctx.font = `700 22px ${F}`;
    ctx.fillText('🛒 รายการที่ควรซื้อ', mx, 42);
    ctx.font = `400 13px ${F}`;
    const dstr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(`${data.length} รายการ · ${dstr}`, mx, 66);

    let y = itemsTop;
    let est = 0;
    for (const r of data) {
      // item card
      ctx.fillStyle = '#ffffff'; rrect(mx, y, W - 2 * mx, blockH, 14); ctx.fill();
      ctx.strokeStyle = '#e6ece9'; ctx.lineWidth = 1; rrect(mx, y, W - 2 * mx, blockH, 14); ctx.stroke();
      const ix = mx + pad;

      // name + buy
      ctx.textAlign = 'right'; ctx.fillStyle = '#2f9e6b'; ctx.font = `700 15px ${F}`;
      const buyTx = `ซื้อ ${this.svc.fmtN(r.buy)} ${r.unit}`;
      ctx.fillText(buyTx, W - mx - pad, y + 27);
      const buyW = ctx.measureText(buyTx).width;
      ctx.textAlign = 'left'; ctx.fillStyle = '#23302a'; ctx.font = `700 16px ${F}`;
      ctx.fillText(this.clip(ctx, r.name, W - 2 * mx - 2 * pad - buyW - 14), ix, y + 28);

      // room / stock
      ctx.fillStyle = '#8a9a91'; ctx.font = `400 12px ${F}`;
      ctx.fillText(`${r.room} · เหลือ ${this.svc.fmtN(r.stock)}/${this.svc.fmtN(r.min)} ${r.unit}`, ix, y + 50);

      // prices line: เฉลี่ย (gray) · ถูกสุด (green)
      let px = ix;
      ctx.font = `500 12.5px ${F}`;
      ctx.fillStyle = '#65756d';
      const seg1 = `เฉลี่ย ${r.avg ? this.svc.fmtN(r.avg) : '-'} ฿/ชิ้น`;
      ctx.fillText(seg1, px, y + 72); px += ctx.measureText(seg1).width;
      ctx.fillStyle = '#b8c4bd'; ctx.fillText('   ·   ', px, y + 72); px += ctx.measureText('   ·   ').width;
      ctx.fillStyle = r.low != null ? '#268a5c' : '#b8c4bd'; ctx.font = `700 12.5px ${F}`;
      ctx.fillText(`ถูกสุด ${r.low != null ? this.svc.fmtN(r.low) : '-'} ฿`, px, y + 72);

      est += r.buy * (r.low ?? r.avg ?? 0);
      y += blockH + gap;
    }

    // footer
    y += 6;
    ctx.textAlign = 'left'; ctx.fillStyle = '#65756d'; ctx.font = `500 13px ${F}`;
    ctx.fillText('ประมาณการค่าใช้จ่าย', mx, y + 12);
    ctx.fillStyle = '#9aa9a1'; ctx.font = `400 11px ${F}`;
    ctx.fillText('(คิดจากราคาถูกสุด)', mx, y + 30);
    ctx.textAlign = 'right'; ctx.fillStyle = '#2f9e6b'; ctx.font = `700 24px ${F}`;
    ctx.fillText(`~${this.svc.fmtB(est)} ฿`, W - mx, y + 22);
    ctx.textAlign = 'center'; ctx.fillStyle = '#9aa9a1'; ctx.font = `400 11px ${F}`;
    ctx.fillText('สร้างจากแอปห้องเก็บของ · ราคาประมาณจากประวัติการเติม', W / 2, y + 58);

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
