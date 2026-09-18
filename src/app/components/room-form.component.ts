import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ToastService } from '../toast.service';
import { ROOM_ICONS } from '../models';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [FormsModule],
  template: `
  @if (svc.roomModal().open) {
    <div class="hs-modal-bg open" (click)="backdrop($event)">
      <div class="hs-modal sm">
        <div class="hs-modal-h">
          <h3><i class="ti {{ editing ? 'ti-pencil' : 'ti-door' }}"></i> {{ editing ? 'แก้ไขห้อง' : 'เพิ่มห้อง' }}</h3>
          <button class="hs-modal-x" (click)="svc.closeModals()"><i class="ti ti-x"></i></button>
        </div>
        <div class="hs-form">
          <div class="f full"><label>ชื่อห้อง</label><input type="text" [(ngModel)]="name" placeholder="เช่น ห้องนั่งเล่น"></div>
          <div class="f full"><label>ไอคอน</label>
            <div class="hs-icon-pick">
              @for (ic of icons; track ic) {
                <button type="button" [class.on]="ic===icon" (click)="icon=ic"><i class="ti {{ ic }}"></i></button>
              }
            </div>
          </div>
        </div>
        <div class="hs-modal-foot">
          <button class="hs-btn ghost" (click)="svc.closeModals()">ยกเลิก</button>
          <button class="hs-btn primary" (click)="save()"><i class="ti ti-check"></i> บันทึก</button>
        </div>
      </div>
    </div>
  }
  `,
})
export class RoomFormComponent {
  svc = inject(InventoryService);
  private toast = inject(ToastService);
  icons = ROOM_ICONS;
  editing = false;
  name = '';
  icon = ROOM_ICONS[0];

  constructor() {
    effect(() => {
      const m = this.svc.roomModal();
      if (!m.open) return;
      this.editing = !!m.room;
      this.name = m.room?.name || '';
      this.icon = m.room?.icon || ROOM_ICONS[this.svc.rooms().length % ROOM_ICONS.length];
    });
  }

  backdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('hs-modal-bg')) this.svc.closeModals(); }

  async save() {
    if (!this.name.trim()) return;
    const editing = this.editing;
    try {
      await this.svc.saveRoom(this.name.trim(), this.icon, this.svc.roomModal().room?.id);
      this.svc.closeModals();
      this.toast.success(editing ? 'แก้ไขห้องแล้ว' : 'เพิ่มห้องแล้ว');
    } catch (e: any) {
      this.toast.error('บันทึกไม่สำเร็จ: ' + (e?.code || e?.message || e));
    }
  }
}
