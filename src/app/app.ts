import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventoryService } from './inventory.service';
import { AuthService } from './auth.service';
import { ItemFormComponent } from './components/item-form.component';
import { RestockComponent } from './components/restock.component';
import { RoomFormComponent } from './components/room-form.component';
import { LoginComponent } from './components/login.component';
import { HistoryComponent } from './components/history.component';
import { ToastComponent } from './components/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    ItemFormComponent, RestockComponent, RoomFormComponent, LoginComponent, HistoryComponent, ToastComponent],
  template: `
  @if (!authResolved()) {
    <div class="hs-boot"><div class="hs-boot-ic">🏠</div><div class="hs-spin"></div></div>
  } @else if (needLogin()) {
    <app-login />
  } @else {
    <div class="hs-shell">
      <aside class="hs-side" [class.open]="sideOpen()">
        <div class="hs-brand">
          <span class="hs-brand-ic">🏠</span>
          <div class="hs-brand-tx">
            <div class="hs-brand-name">ห้องเก็บของ</div>
            <div class="hs-brand-sub">จัดการของในบ้าน ให้เป็นระเบียบ</div>
          </div>
        </div>

        <nav class="hs-nav" (click)="sideOpen.set(false)">
          <a class="hs-nav-item" routerLink="/home" routerLinkActive="active"><i class="ti ti-home"></i> <span>หน้าหลัก</span></a>
          <a class="hs-nav-item" routerLink="/all" routerLinkActive="active"><i class="ti ti-list-details"></i> <span>รายการทั้งหมด</span></a>
          <a class="hs-nav-item" routerLink="/categories" routerLinkActive="active"><i class="ti ti-tag"></i> <span>หมวดหมู่</span></a>
          <a class="hs-nav-item" routerLink="/rooms" routerLinkActive="active"><i class="ti ti-door"></i> <span>ห้องในบ้าน</span></a>
          <a class="hs-nav-item" routerLink="/alerts" routerLinkActive="active"><i class="ti ti-bell"></i> <span>แจ้งเตือน</span>
            <span class="hs-nav-badge" [class.on]="svc.refillCount() > 0">{{ svc.refillCount() }}</span></a>
          <a class="hs-nav-item" routerLink="/settings" routerLinkActive="active"><i class="ti ti-settings"></i> <span>ตั้งค่า</span></a>
        </nav>

        <div class="hs-side-foot">
          <div class="hs-side-illus">🏡🌿</div>
          <div class="hs-side-foot-t">บ้านของเรา<br>มีของอะไรบ้าง</div>
          <button class="hs-side-foot-b" (click)="svc.openItem(null)">เริ่มจัดเก็บกันเลย 💚</button>
        </div>
      </aside>
      <div class="hs-side-scrim" [class.show]="sideOpen()" (click)="sideOpen.set(false)"></div>

      <div class="hs-col">
        <header class="hs-top">
          <button class="hs-burger" (click)="sideOpen.set(true)" aria-label="เมนู"><i class="ti ti-menu-2"></i></button>
          <div class="hs-search">
            <i class="ti ti-search"></i>
            <input type="text" placeholder="ค้นหาชื่อสินค้า หมวดหมู่ หรือห้อง…"
              [ngModel]="svc.globalSearch()" (ngModelChange)="onSearch($event)">
            <span class="hs-search-kbd">⌘ K</span>
          </div>
          <div class="hs-top-actions">
            <a class="hs-top-btn" routerLink="/alerts" title="แจ้งเตือน">
              <i class="ti ti-bell"></i><span class="hs-top-badge" [class.on]="svc.refillCount() > 0">{{ svc.refillCount() }}</span></a>
            <button class="hs-top-btn" (click)="toggleDark()" title="สลับโหมด"><i class="ti" [class.ti-moon]="!dark()" [class.ti-sun]="dark()"></i></button>
            <div class="hs-usermenu">
              <button class="hs-user" (click)="menu.set(!menu())">
                @if (auth.photoURL()) { <img class="hs-user-av" [src]="auth.photoURL()" referrerpolicy="no-referrer" alt=""> }
                @else { <span class="hs-user-av">{{ auth.user() ? auth.initial() : 'M' }}</span> }
                <span class="hs-user-name">{{ auth.user() ? auth.displayName() : 'พรีวิว' }}</span>
                <i class="ti ti-chevron-down hs-user-caret"></i>
              </button>
              @if (menu()) {
                <div class="hs-user-pop">
                  @if (auth.user()) {
                    <div class="hs-user-info"><b>{{ auth.displayName() }}</b><span>{{ auth.user()?.email }}</span></div>
                    <button class="hs-user-item" (click)="logout()"><i class="ti ti-logout"></i> ออกจากระบบ</button>
                  } @else {
                    <div class="hs-user-info"><b>โหมดพรีวิว</b><span>ยังไม่ได้ต่อ Firebase</span></div>
                  }
                </div>
              }
            </div>
          </div>
        </header>

        <main class="hs-main"><router-outlet /></main>
      </div>
    </div>

    <app-item-form />
    <app-restock />
    <app-room-form />
    <app-history />
  }
  <app-toast />
  `,
  styles: [`
    .hs-boot{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
    .hs-boot-ic{font-size:44px}
    .hs-spin{width:30px;height:30px;border:3px solid var(--hs-line2);border-top-color:var(--hs-green);border-radius:50%;animation:hsspin .7s linear infinite}
    @keyframes hsspin{to{transform:rotate(360deg)}}
    .hs-usermenu{position:relative}
    .hs-user{display:flex;align-items:center;gap:9px;padding:0 8px 0 4px;height:44px;border:1px solid transparent;background:none;border-radius:12px;cursor:pointer;font-family:inherit;transition:.14s}
    .hs-user:hover{border-color:var(--hs-line2);background:var(--hs-surface)}
    .hs-user-av{width:36px;height:36px;border-radius:50%;object-fit:cover;background:var(--hs-green);color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center}
    .hs-user-name{font-size:13.5px;font-weight:600;color:var(--hs-ink);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .hs-user-caret{font-size:15px;color:var(--hs-ink3)}
    .hs-user-pop{position:absolute;right:0;top:52px;min-width:220px;background:var(--hs-surface);border:1px solid var(--hs-line2);border-radius:14px;box-shadow:var(--hs-shadow-lg);padding:8px;z-index:70}
    .hs-user-info{padding:10px 12px;border-bottom:1px solid var(--hs-line);margin-bottom:6px;display:flex;flex-direction:column;gap:2px}
    .hs-user-info b{font-size:13.5px;color:var(--hs-ink)}
    .hs-user-info span{font-size:12px;color:var(--hs-ink3);overflow:hidden;text-overflow:ellipsis}
    .hs-user-item{width:100%;display:flex;align-items:center;gap:9px;height:40px;padding:0 12px;border:none;background:none;border-radius:9px;font-family:inherit;font-size:13.5px;font-weight:500;color:var(--hs-ink2);cursor:pointer;text-align:left}
    .hs-user-item:hover{background:var(--hs-danger-soft);color:var(--hs-danger)}
    .hs-user-item i{font-size:18px}
    @media(max-width:920px){ .hs-user-name{display:none} }
  `],
})
export class App {
  svc = inject(InventoryService);
  auth = inject(AuthService);
  private router = inject(Router);
  sideOpen = signal(false);
  menu = signal(false);
  dark = signal(false);

  authResolved = computed(() => this.svc.notConfigured || this.auth.ready());
  needLogin = computed(() => !this.svc.notConfigured && !this.auth.user());

  constructor() {
    try { this.dark.set(localStorage.getItem('ui_dark') === '1'); } catch {}
    document.documentElement.classList.toggle('dark', this.dark());
  }

  onSearch(v: string) {
    this.svc.globalSearch.set(v);
    if (v && !this.router.url.startsWith('/all')) this.router.navigate(['/all']);
  }

  toggleDark() {
    this.dark.update((d) => !d);
    document.documentElement.classList.toggle('dark', this.dark());
    try { localStorage.setItem('ui_dark', this.dark() ? '1' : '0'); } catch {}
  }

  logout() { this.menu.set(false); this.auth.logout(); }
}
