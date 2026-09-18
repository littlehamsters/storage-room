import { Component, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-rooms',
  standalone: true,
  template: `
  <div class="hs-hero">
    <div class="hs-hello">
      <div class="hs-hello-t">ห้องในบ้าน</div>
      <div class="hs-hello-s">จัดการห้องเก็บของทั้งหมด</div>
    </div>
    <button class="hs-btn primary" (click)="svc.openRoom(null)"><i class="ti ti-plus"></i> เพิ่มห้อง</button>
  </div>

  @if (svc.rooms().length) {
    <div class="hs-rooms-list">
      @for (room of svc.rooms(); track room.id) {
        <div class="hs-roomrow">
          <div class="hs-roomrow-ic"><i class="ti {{ room.icon }}"></i></div>
          <div>
            <div class="hs-roomrow-nm">{{ room.name }}</div>
            <div class="hs-roomrow-ct">{{ svc.itemsInRoom(room.id).length }} รายการ · {{ svc.fmtB(roomValue(room.id)) }} บาท</div>
          </div>
          <div class="hs-roomrow-act">
            <button class="hs-ib" title="แก้ไข" (click)="svc.openRoom(room)"><i class="ti ti-pencil"></i></button>
            <button class="hs-ib del" title="ลบ" (click)="remove(room.id, room.name)"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      }
    </div>
  } @else {
    <div class="hs-panel"><div class="hs-empty"><i class="ti ti-door"></i>
      <b>ยังไม่มีห้อง</b>กด “เพิ่มห้อง” เพื่อเริ่มต้น</div></div>
  }
  `,
})
export class RoomsComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);
  roomValue = (id: string) => this.svc.itemsInRoom(id).reduce((s, i) => s + this.svc.value(i), 0);
  async remove(id: string, name: string) {
    const ct = this.svc.itemsInRoom(id).length;
    if (ct && !confirm(`ห้อง “${name}” มี ${ct} รายการ จะถูกลบไปด้วย ยืนยัน?`)) return;
    if (!ct && !confirm(`ลบห้อง “${name}”?`)) return;
    try { await this.svc.deleteRoom(id); this.toast.success('ลบห้องแล้ว'); }
    catch (e: any) { this.toast.error('ลบไม่สำเร็จ: ' + (e?.code || e?.message || e)); }
  }
}
