/* ═══════════════════════════════════════════════════════════════════
   ดึง/ย้ายข้อมูลเก่าที่อยู่ใต้ users/<uid>/{rooms,items}
   ไปยัง collection ส่วนกลาง rooms/items (ใช้ Admin SDK → ข้าม rules)

   วิธีใช้:
     1) Firebase Console → ⚙️ Project settings → Service accounts
        → "Generate new private key" → บันทึกเป็น serviceAccountKey.json ที่ root โปรเจกต์
     2) npm i firebase-admin
     3) ดูข้อมูลก่อน:       node scripts/migrate-firestore.mjs
        export เป็นไฟล์:     node scripts/migrate-firestore.mjs export
        ย้ายเข้าส่วนกลางเลย: node scripts/migrate-firestore.mjs migrate
     4) ลบ serviceAccountKey.json ทิ้งหลังใช้เสร็จ (อย่า commit ขึ้น git)
   ═══════════════════════════════════════════════════════════════════ */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'node:fs';

const key = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(key) });
const db = getFirestore();

const mode = process.argv[2] || 'inspect'; // inspect | export | migrate

const userDocs = await db.collection('users').listDocuments();
const rooms = [];
const items = [];
for (const u of userDocs) {
  const rs = await u.collection('rooms').get();
  const is = await u.collection('items').get();
  rs.forEach((d) => rooms.push({ id: d.id, ...d.data() }));
  is.forEach((d) => items.push({ id: d.id, ...d.data() }));
}
console.log(`พบ ${rooms.length} ห้อง, ${items.length} รายการ จาก ${userDocs.length} บัญชี`);

if (mode === 'export') {
  const out = { version: 3, created: new Date().toISOString(), note: 'ห้องเก็บของ export', rooms, items };
  writeFileSync('home_stock_export.json', JSON.stringify(out, null, 2));
  console.log('✓ เขียนไฟล์ home_stock_export.json — นำเข้าผ่านหน้า “ตั้งค่า → นำเข้าข้อมูล” ได้เลย');
} else if (mode === 'migrate') {
  const batch = db.batch();
  rooms.forEach((r) => { const { id, ...d } = r; batch.set(db.collection('rooms').doc(id), d); });
  items.forEach((i) => { const { id, ...d } = i; batch.set(db.collection('items').doc(id), d); });
  await batch.commit();
  console.log('✓ ย้ายข้อมูลเข้า collection ส่วนกลาง rooms/items แล้ว — เปิดแอปได้เลย');
} else {
  console.log('โหมด inspect (ดูอย่างเดียว) — เพิ่ม argument "export" หรือ "migrate" เพื่อทำจริง');
}
process.exit(0);
