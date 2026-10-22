'use strict';

const COLOR_PRESETS = {
  'เขียว': 0x57F287,
  'green': 0x57F287,
  'น้ำเงิน': 0x5865F2,
  'ฟ้า': 0x3498DB,
  'blue': 0x5865F2,
  'แดง': 0xED4245,
  'red': 0xED4245,
  'เหลือง': 0xFEE75C,
  'yellow': 0xFEE75C,
  'ทอง': 0xF1C40F,
  'gold': 0xF1C40F,
  'ส้ม': 0xE67E22,
  'orange': 0xE67E22,
  'ม่วง': 0x9B59B6,
  'purple': 0x9B59B6,
  'ชมพู': 0xEB459E,
  'pink': 0xEB459E,
  'ดำ': 0x23272A,
  'black': 0x23272A,
  'ขาว': 0xFFFFFF,
  'white': 0xFFFFFF,
  'เบลอเพิล': 0x5865F2,
  'blurple': 0x5865F2
};

function parseColor(input, defaultColor = 0x5865F2) {
  if (!input) return defaultColor;
  const str = String(input).trim().toLowerCase();

  if (COLOR_PRESETS[str]) {
    return COLOR_PRESETS[str];
  }

  const hexClean = str.replace('#', '').replace('0x', '');
  if (/^[0-9a-f]{6}$/i.test(hexClean)) {
    return parseInt(hexClean, 16);
  }

  return defaultColor;
}

module.exports = {
  parseColor,
  COLOR_PRESETS
};
