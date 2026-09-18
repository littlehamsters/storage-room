import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-no-access',
  standalone: true,
  template: `
  <div class="na-wrap">
    <div class="na-card">
      <div class="na-ic"><i class="ti ti-lock-exclamation"></i></div>
      <div class="na-title">ไม่มีสิทธิ์เข้าถึง</div>
      <div class="na-sub">บัญชีนี้ไม่ได้อยู่ในกลุ่มที่ได้รับอนุญาตให้เข้าถึงข้อมูลบ้านนี้</div>
      @if (auth.user()) {
        <div class="na-acct">
          @if (auth.photoURL()) { <img [src]="auth.photoURL()" referrerpolicy="no-referrer" alt=""> }
          @else { <span class="na-av">{{ auth.initial() }}</span> }
          <div class="na-acct-tx"><b>{{ auth.displayName() }}</b><span>{{ auth.user()?.email }}</span></div>
        </div>
      }
      <div class="na-hint">หากคิดว่าควรมีสิทธิ์ ให้เจ้าของบ้านเพิ่มอีเมลนี้ในรายชื่อกลุ่ม แล้วเข้าสู่ระบบใหม่</div>
      <button class="na-btn" (click)="auth.logout()"><i class="ti ti-logout"></i> ออกจากระบบ / สลับบัญชี</button>
    </div>
  </div>
  `,
  styles: [`
    .na-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
      background:radial-gradient(circle at 15% 10%,#fdeaea,transparent 42%),radial-gradient(circle at 85% 90%,#eaf6ef,transparent 42%),var(--hs-bg)}
    .na-card{background:var(--hs-surface);border:1px solid var(--hs-line);border-radius:24px;padding:44px 36px;width:min(420px,100%);text-align:center;box-shadow:var(--hs-shadow-lg)}
    .na-ic{width:66px;height:66px;margin:0 auto 16px;border-radius:18px;background:var(--hs-danger-soft);color:var(--hs-danger);display:flex;align-items:center;justify-content:center;font-size:34px}
    .na-title{font-size:22px;font-weight:700;color:var(--hs-ink)}
    .na-sub{font-size:13.5px;color:var(--hs-ink2);margin:8px 0 20px;line-height:1.6}
    .na-acct{display:flex;align-items:center;gap:11px;justify-content:center;background:var(--hs-bg);border:1px solid var(--hs-line);border-radius:14px;padding:12px 16px;margin-bottom:16px}
    .na-acct img,.na-av{width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0}
    .na-av{background:var(--hs-green);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}
    .na-acct-tx{text-align:left;min-width:0}
    .na-acct-tx b{display:block;font-size:14px;color:var(--hs-ink)}
    .na-acct-tx span{display:block;font-size:12px;color:var(--hs-ink3);overflow:hidden;text-overflow:ellipsis}
    .na-hint{font-size:12px;color:var(--hs-ink3);line-height:1.6;margin-bottom:20px}
    .na-btn{width:100%;height:46px;border:1px solid var(--hs-line2);background:var(--hs-surface);border-radius:12px;
      display:flex;align-items:center;justify-content:center;gap:9px;font-family:inherit;font-size:14px;font-weight:600;color:var(--hs-ink);cursor:pointer;transition:.15s}
    .na-btn:hover{border-color:var(--hs-danger);color:var(--hs-danger)}
    .na-btn i{font-size:19px}
  `],
})
export class NoAccessComponent {
  auth = inject(AuthService);
}
