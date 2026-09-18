import { Component, computed, inject } from '@angular/core';
import { InventoryService } from '../inventory.service';
import { AuthService } from '../auth.service';
import { ItemsPanelComponent } from '../components/items-panel.component';
import { SummaryComponent } from '../components/summary.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ItemsPanelComponent, SummaryComponent],
  template: `
  <div class="hs-hero">
    <div class="hs-hello">
      <div class="hs-hello-t">สวัสดีค่ะ {{ greetName() }} <span>🏠</span></div>
      <div class="hs-hello-s">จัดการสต็อกของในบ้านได้ง่าย ๆ แค่ไม่กี่คลิก</div>
    </div>
    <app-summary />
  </div>

  <div class="hs-rooms">
    @for (room of svc.rooms(); track room.id) {
      <button class="hs-room" [class.active]="room.id === svc.selectedRoom()?.id" (click)="svc.selectedRoomId.set(room.id)">
        <div class="hs-room-thumb"><i class="ti {{ room.icon }}"></i></div>
        <div class="hs-room-b"><span class="hs-room-nm">{{ room.name }}</span><i class="ti ti-chevron-right"></i></div>
        <span class="hs-room-ct">{{ svc.itemsInRoom(room.id).length }} รายการ</span>
      </button>
    }
    <button class="hs-room add" (click)="svc.openRoom(null)"><i class="ti ti-circle-plus"></i><span>เพิ่มห้อง</span></button>
  </div>

  @if (svc.selectedRoom(); as room) {
    <app-items-panel [items]="roomItems()" [title]="room.name" [icon]="room.icon" [meta]="meta()" [presetRoomId]="room.id" />
  } @else {
    <div class="hs-panel"><div class="hs-empty"><i class="ti ti-door"></i>
      <b>ยังไม่มีห้อง</b>กด “เพิ่มห้อง” เพื่อเริ่มจัดเก็บของในบ้าน</div></div>
  }
  `,
})
export class HomeComponent {
  svc = inject(InventoryService);
  private auth = inject(AuthService);
  greetName = computed(() => this.auth.user() ? this.auth.firstName() : 'Mantana');
  roomItems = computed(() => {
    const r = this.svc.selectedRoom();
    return r ? this.svc.itemsInRoom(r.id) : [];
  });
  meta = computed(() => {
    const val = this.roomItems().reduce((s, i) => s + this.svc.value(i), 0);
    return `${this.roomItems().length} รายการ · มูลค่ารวม <b>${this.svc.fmtB(val)} บาท</b>`;
  });
}
