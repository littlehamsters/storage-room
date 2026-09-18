export interface LogEntry {
  date: string;   // YYYY-MM-DD
  qty: number;
  price?: number;
}

export interface Item {
  id: string;
  name: string;
  brand?: string;
  roomId: string;
  category?: string;
  unit: string;
  stock: number;
  min: number;
  price: number;
  note?: string;
  log?: LogEntry[];
  createdAt?: number;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
  order?: number;
}

export type StockStatus = 'ok' | 'low' | 'out';

export const UNITS = ['ชิ้น', 'อัน', 'ตัว', 'ใบ', 'ขวด', 'แพ็ค', 'ม้วน', 'กล่อง', 'ถุง', 'หลอด', 'ก้อน', 'เครื่อง', 'ชุด'];

export const ROOM_ICONS = [
  'ti-sofa', 'ti-bed', 'ti-tools-kitchen-2', 'ti-bath',
  'ti-tools-kitchen-3', 'ti-armchair', 'ti-plant-2', 'ti-wash-machine',
  'ti-building-store', 'ti-box', 'ti-home-2', 'ti-stairs',
  'ti-garden-cart', 'ti-desk', 'ti-door', 'ti-building-warehouse',
  'ti-paw', 'ti-cat', 'ti-dog', 'ti-fish', 'ti-cheese', 'ti-mouse-2',
];

export const CATS = ['เฟอร์นิเจอร์', 'เครื่องใช้ไฟฟ้า', 'ของตกแต่ง', 'ของใช้ทั่วไป',
  'ทำความสะอาด', 'เครื่องปรุง', 'ของแห้ง', 'เบ็ดเตล็ด'];

export const CAT_EMOJI: Record<string, string> = {
  'เฟอร์นิเจอร์': '🛋️', 'เครื่องใช้ไฟฟ้า': '📺', 'ของตกแต่ง': '🖼️', 'ของใช้ทั่วไป': '🧺',
  'ทำความสะอาด': '🧴', 'เครื่องปรุง': '🧂', 'ของแห้ง': '🍚', 'เบ็ดเตล็ด': '📦',
};
