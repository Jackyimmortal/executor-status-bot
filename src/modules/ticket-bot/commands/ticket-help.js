'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-help')
    .setDescription('คู่มือการใช้งานบอททิกเก็ตและการตั้งค่าสิทธิ์'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 คู่มือการใช้งานระบบ Ticket (ห้องติดต่อทีมงาน)')
      .setDescription('ระบบเปิดตั๋ว/ห้องสนทนาส่วนตัวระหว่างสมาชิกกับทีมงานอย่างปลอดภัย')
      .addFields(
        {
          name: '🛠️ คำสั่งทั้งหมด',
          value: [
            '`/ticket-panel` — สร้างแผงเปิดทิกเก็ตในห้องแชท (เลือกยศทีมงาน, ใส่รูปภาพแบนเนอร์/โลโก้ได้)',
            '`/ticket-close` — ปิดห้องทิกเก็ตปัจจุบัน',
            '`/ticket-add` — เพิ่มสมาชิกหรือเพื่อนเข้ามาในห้องทิกเก็ต',
            '`/ticket-remove` — นำสมาชิกออกจากห้องทิกเก็ต',
            '`/ticket-help` — เปิดดูคู่มือนี้'
          ].join('\n')
        },
        {
          name: '⚙️ สิ่งที่ต้องเตรียมก่อนสร้างแผง',
          value: [
            '1. **ยศทีมงาน (Support Role):** สร้างยศเช่น `@Staff` หรือ `@Admin` เพื่อระบุในคำสั่ง `/ticket-panel`',
            '2. **หมวดหมู่ (Category - ถ้ามี):** สร้าง Category เช่น `📩 TICKETS` เพื่อให้ห้องใหม่ไปรวมกันอย่างเป็นระเบียบ',
            '3. **สิทธิ์ของบอท:** ตรวจสอบว่าบอทมีสิทธิ์ `Manage Channels (จัดการช่อง)` เพื่อให้บอทสร้างและลบห้องได้'
          ].join('\n')
        },
        {
          name: '🔒 ความเป็นส่วนตัวในห้องทิกเก็ต',
          value: 'เมื่อสมาชิกกดปุ่มเปิดทิกเก็ต บอทจะสร้างห้องที่ **ซ่อนจากคนทั่วไป (@everyone)** โดยมีเพียง **ผู้เปิดทิกเก็ต** และ **ทีมงาน (Support Role)** เท่านั้นที่มองเห็นและพิมพ์ได้'
        }
      )
      .setFooter({ text: 'XSTOREHUB • ระบบทิกเก็ตอัตโนมัติ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
