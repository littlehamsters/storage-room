import { Component, inject, signal } from '@angular/core';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
  <div class="hs-hero"><div class="hs-hello">
    <div class="hs-hello-t">ตั้งค่า</div>
    <div class="hs-hello-s">สำรอง กู้คืน และจัดการข้อมูล</div></div></div>

  @if (svc.notConfigured) {
    <div class="hs-notice"><i class="ti ti-alert-circle"></i>
      <div>ยังไม่ได้ตั้งค่า Firebase — วาง <code>firebaseConfig</code> ในไฟล์
        <b>src/app/firebase-config.ts</b> แล้วรีโหลด ข้อมูลจึงจะซิงก์ขึ้นคลาวด์</div></div>
  }

  <div class="hs-set">
    <div class="hs-set-card"><h4><i class="ti ti-download"></i> สำรองข้อมูล</h4>
      <p>ดาวน์โหลดข้อมูลทั้งหมด (ห้อง + รายการ) เป็นไฟล์ JSON</p>
      <button class="hs-btn primary" (click)="backup()"><i class="ti ti-download"></i> ดาวน์โหลดไฟล์สำรอง</button></div>

    <div class="hs-set-card"><h4><i class="ti ti-upload"></i> นำเข้าข้อมูล</h4>
      <p>กู้คืนจากไฟล์สำรอง (จะเขียนทับข้อมูลบนคลาวด์ทั้งหมด)</p>
      <button class="hs-btn ghost" (click)="file.click()"><i class="ti ti-upload"></i> เลือกไฟล์…</button>
      <input #file type="file" accept="application/json" hidden (change)="restore($event)"></div>

    <div class="hs-set-card"><h4><i class="ti ti-sparkles"></i> ข้อมูลตัวอย่าง</h4>
      <p>โหลดชุดข้อมูลตัวอย่าง (เฟอร์นิเจอร์ เครื่องใช้ไฟฟ้า พร้อมราคา) — จะเขียนทับข้อมูลปัจจุบัน</p>
      <button class="hs-btn ghost" [disabled]="busy()" (click)="seed()"><i class="ti ti-refresh"></i> {{ busy() ? 'กำลังโหลด…' : 'โหลดข้อมูลตัวอย่าง' }}</button></div>

    <div class="hs-set-card"><h4><i class="ti ti-info-circle"></i> เกี่ยวกับ</h4>
      <p>ห้องเก็บของ · Angular + Cloud Firestore · ข้อมูลซิงก์แบบเรียลไทม์ข้ามอุปกรณ์<br>
        ปัจจุบันมี {{ svc.rooms().length }} ห้อง, {{ svc.items().length }} รายการ</p></div>
  </div>
  `,
  styles: [`
    .hs-notice{display:flex;gap:10px;align-items:flex-start;background:var(--hs-warn-soft);color:var(--hs-ink);
      border:1px solid var(--hs-warn);border-radius:14px;padding:14px 16px;margin-bottom:16px;font-size:13.5px;line-height:1.55}
    .hs-notice i{font-size:20px;color:var(--hs-warn);flex-shrink:0}
    .hs-notice code{background:rgba(0,0,0,.06);padding:1px 6px;border-radius:5px;font-size:12.5px}
  `],
})
export class SettingsComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);
  busy = signal(false);

  backup() {
    const blob = new Blob([JSON.stringify(this.svc.exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'home_stock_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async restore(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!confirm('นำเข้าข้อมูล? ข้อมูลปัจจุบันบนคลาวด์จะถูกเขียนทับทั้งหมด')) { input.value = ''; return; }
      this.busy.set(true);
      await this.svc.importData(data);
      this.toast.success('นำเข้าข้อมูลสำเร็จ');
    } catch (err: any) {
      this.toast.error('นำเข้าไม่สำเร็จ: ' + (err?.code || err?.message || err));
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  async seed() {
    if (!confirm('โหลดข้อมูลตัวอย่างชุดใหม่? ข้อมูลปัจจุบันจะถูกเขียนทับ')) return;
    this.busy.set(true);
    try { await this.svc.seedDemo(); this.toast.success('โหลดข้อมูลตัวอย่างแล้ว'); }
    catch (e: any) { this.toast.error('ไม่สำเร็จ: ' + (e?.code || e?.message || e)); }
    finally { this.busy.set(false); }
  }
}
