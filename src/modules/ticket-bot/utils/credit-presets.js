'use strict';

const SAMPLE_PRODUCTS = [
  'Delta Executor (Key VIP 30 วัน)',
  'Delta Executor (Key ถาวร Lifetime)',
  'Wave Executor (Key VIP)',
  'Solara Executor (VIP Access)',
  'Xeno Executor (Key 7 วัน)',
  'Roblox Script Blox Fruits (Auto Farm)',
  'Roblox Script King Legacy (God Mode)',
  'Roblox Script Bedwars (ESP & Aimbot)',
  'Roblox Script Fisch (Auto Fishing VIP)',
  'ไอดีไก่ตัน Blox Fruits (เผ่า V4 ครบ)',
  'Robux 500 R$ (โอนกลุ่มทันที)',
  'Robux 1,000 R$ (เข้าเร็ว ปลอดภัย)',
  'Discord Nitro Boost 3 เดือน'
];

const SAMPLE_COMMENTS = [
  '+1 เครดิตครับ ได้ของจริง ไวมากๆ แนะนำร้านนี้เลยครับ 🔥',
  'เครดิตแน่นๆ ครับ สั่งรอบที่ 2 แล้ว แอดมินตอบไว บริการดีมาก 👍',
  'ได้รับคีย์แล้วครับ ใช้งานได้ปกติ ไม่เด้ง ไม่โดนแบน ขอบคุณครับ ⭐⭐⭐⭐⭐',
  'ได้ของจริงครับ ไม่โกงแน่นอน 100% ใครลังเลแนะนำเลยครับ',
  '+1 เครดิตครับ ส่งของไวมาก รอไม่ถึง 2 นาที ได้ของเลย สุดยอดครับ ✨',
  'แอดมินใจดีมากครับ สอนติดตั้งจนใช้งานได้ บริการประทับใจมาก',
  'เครดิตครับผม ซื้อร้านนี้ประจำ ปลอดภัย ได้ของชัวร์ 💖',
  '+1 ครับ ไก่ตันของแท้ มีของตรงปก คุ้มราคามากครับ 💯',
  'ได้รับโรบัคเรียบร้อยครับ เข้าไวมาก ไม่มีดึงคืนแน่นอน เครดิตครับ',
  'โปรแกรมรันลื่นมากครับ คีย์แท้ 100% ไว้รอบหน้ามาอุดหนุนใหม่นะครับ 🎉',
  '+1 เครดิตร้าน XSTOREHUB ครับ บริการรวดเร็วทันใจ เชื่อถือได้',
  'ซื้อแล้วได้ของเลย ระบบอัตโนมัติทำงานไวมาก ชอบมากครับ ⭐⭐⭐⭐⭐',
  'เครดิตครับ แอดมินตอบแชทสุภาพมาก ของดีมีคุณภาพ แนะนำครับ'
];

const SAMPLE_PRICES = [
  '35 บาท',
  '50 บาท',
  '89 บาท',
  '100 บาท',
  '120 บาท',
  '150 บาท',
  '200 บาท',
  '250 บาท',
  '300 บาท',
  '500 บาท'
];

const SAMPLE_BUYERS = [
  'น้องมิกซ์_Roblox',
  'BankZa007',
  'Ball_BloxFruits',
  'Kittisak_Gamer',
  'Ploy_Cute99',
  'Nonny_Th',
  'Nut_Studio',
  'Film_ProPlayer',
  'Beam_Ch',
  'First_Hunter',
  'Gun_V4Max',
  'Pete_Delta',
  'Ice_Gaming'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  SAMPLE_PRODUCTS,
  SAMPLE_COMMENTS,
  SAMPLE_PRICES,
  SAMPLE_BUYERS,
  getRandomItem
};
