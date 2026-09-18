import { Injectable, computed, signal } from '@angular/core';
import {
  GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut,
} from 'firebase/auth';
import { auth } from './firebase';
import { firebaseNotConfigured } from './firebase-config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  /** true once Firebase has resolved the initial auth state */
  readonly ready = signal(firebaseNotConfigured);
  readonly error = signal('');

  readonly displayName = computed(() => this.user()?.displayName || '');
  readonly firstName = computed(() => (this.displayName().split(' ')[0]) || 'คุณ');
  readonly photoURL = computed(() => this.user()?.photoURL || '');
  readonly initial = computed(() => (this.displayName() || this.user()?.email || 'U').charAt(0).toUpperCase());

  constructor() {
    if (firebaseNotConfigured) return;
    onAuthStateChanged(auth, (u) => { this.user.set(u); this.ready.set(true); });
  }

  async login() {
    this.error.set('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        this.error.set(this.friendly(e?.code) || e?.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    }
  }

  logout() { return signOut(auth); }

  private friendly(code?: string) {
    switch (code) {
      case 'auth/unauthorized-domain': return 'โดเมนนี้ยังไม่ได้อนุญาตใน Firebase Auth → เพิ่มใน Authorized domains';
      case 'auth/operation-not-allowed': return 'ยังไม่ได้เปิด Google sign-in ใน Firebase Console';
      case 'auth/popup-blocked': return 'เบราว์เซอร์บล็อกป๊อปอัป ลองอนุญาตแล้วเข้าใหม่';
      default: return '';
    }
  }
}
