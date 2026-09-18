/* ═══════════════════════════════════════════════════════════════════
   Firebase configuration (client config — เปิดเผยได้ตามปกติ
   ความปลอดภัยจริงคุมด้วย Firestore Security Rules + Firebase Auth)
   ═══════════════════════════════════════════════════════════════════ */
export const firebaseConfig = {
  apiKey: 'AIzaSyCo08NQDrWCFV5ia7ITFTlLMvm488Wjn-k',
  authDomain: 'storage-room-cf451.firebaseapp.com',
  projectId: 'storage-room-cf451',
  storageBucket: 'storage-room-cf451.firebasestorage.app',
  messagingSenderId: '365371456445',
  appId: '1:365371456445:web:1a54fa91c23b7936d930d4',
  measurementId: 'G-9NWBG8RJL3',
};

// true = ยังไม่ได้วาง config จริง (แอปจะเข้าโหมดพรีวิว)
export const firebaseNotConfigured = firebaseConfig.projectId === 'PASTE_PROJECT_ID';
