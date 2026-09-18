import { Component, inject } from '@angular/core';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
  <div class="hs-toasts">
    @for (t of toast.toasts(); track t.id) {
      <div class="hs-toast {{ t.type }}" (click)="toast.dismiss(t.id)">
        <i class="ti" [class.ti-circle-check]="t.type==='success'" [class.ti-alert-circle]="t.type==='error'"></i>
        <span>{{ t.msg }}</span>
      </div>
    }
  </div>
  `,
  styles: [`
    .hs-toasts{position:fixed;right:20px;bottom:20px;z-index:4000;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
    .hs-toast{display:flex;align-items:center;gap:10px;min-width:220px;max-width:360px;padding:13px 16px;border-radius:12px;
      font-size:13.5px;font-weight:500;color:#fff;box-shadow:0 10px 30px rgba(22,50,38,.25);cursor:pointer;
      animation:hsToastIn .22s cubic-bezier(.22,1,.36,1)}
    .hs-toast i{font-size:19px;flex-shrink:0}
    .hs-toast.success{background:#2f9e6b}
    .hs-toast.error{background:#dc4c4c}
    @keyframes hsToastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    @media(max-width:600px){ .hs-toasts{left:16px;right:16px;bottom:16px} .hs-toast{max-width:none;width:100%} }
  `],
})
export class ToastComponent {
  toast = inject(ToastService);
}
