import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; msg: string; type: 'success' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private n = 0;

  show(msg: string, type: 'success' | 'error' = 'success', ms = 2800) {
    const id = ++this.n;
    this.toasts.update((a) => [...a, { id, msg, type }]);
    setTimeout(() => this.dismiss(id), ms);
  }
  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error', 4200); }
  dismiss(id: number) { this.toasts.update((a) => a.filter((t) => t.id !== id)); }
}
