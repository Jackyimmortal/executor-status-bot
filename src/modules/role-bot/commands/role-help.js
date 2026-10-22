'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-help')
    .setDescription('คู่มือการใช้งานบอทรับยศ การใส่รูปภาพ และวิธียกยศบอท (Role Hierarchy)'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 คู่มือการใช้งาน XSTOREHUB-ROLE')
      .setDescription('ระบบปุ่มกดรับยศอัตโนมัติ (Button Role & Verification System) รองรับรูปภาพและสีแบบกำหนดเอง')
      .addFields(
        {
          name: '🛠️ คำสั่งทั้งหมด',
          value: [
            '`/role-panel` — สร้างแผงรับยศ / ปุ่มยืนยันตัวตนใหม่ (สามารถแนบรูปภาพแบนเนอร์/โลโก้ได้ทันที)',
            '`/role-edit` — แก้ไขรูปภาพ, ข้อความ, หรือสีของแผงเดิมที่มีอยู่แล้ว',
            '`/role-add` — เพิ่มปุ่มยศใหม่เข้าไปในแผงเดิมที่มีอยู่แล้ว',
            '`/role-list` — ดูแผงรับยศทั้งหมดที่สร้างไว้ในเซิร์ฟเวอร์',
            '`/role-help` — เปิดดูคู่มือนี้'
          ].join('\n')
        },
        {
          name: '🖼️ วิธีใส่รูปภาพในแผงรับยศ',
          value: [
            '• **แนบไฟล์ตรงๆ (ง่ายที่สุด):** ในคำสั่ง `/role-panel` หรือ `/role-edit` ให้เลือกตัวเลือก `image_file` แล้วกดเลือกรูปจากคอม/มือถือได้เลย',
            '• **ใช้ลิงก์ URL:** เลือกตัวเลือก `image_url` แล้ววางลิงก์รูปภาพเว็บ',
            '• **ใส่โลโก้มุมขวาบน:** เลือก `thumbnail_file` หรือ `thumbnail_url`',
            '• **เปลี่ยนสีขอบ:** เลือกตัวเลือก `color` เช่น `#5865F2`, `ฟ้า`, `เขียว`, `แดง`, `ทอง`, `ม่วง`, `ชมพู`, `ดำ`'
          ].join('\n')
        },
        {
          name: '⚠️ กฎสำคัญที่สุด: ลำดับชั้นของยศ (Role Hierarchy)',
          value: [
            '1. เปิด Discord ➔ ไปที่ **การตั้งค่าเซิร์ฟเวอร์ (Server Settings)**',
            '2. เลือกแท็บ **บทบาท (Roles)**',
            '3. **คลิกลากยศของบอท (`XSTOREHUB-ROLE`) ให้ไปอยู่ "สูงกว่า" ยศที่คุณจะแจก**',
            '*(ถ้าไม่ลากขึ้นไปสูงกว่า Discord จะไม่อนุญาตให้บอทมอบยศนั้นได้)*'
          ].join('\n')
        },
        {
          name: '🎯 โหมดการทำงานของปุ่ม',
          value: [
            '• **Toggle (ค่าเริ่มต้น):** กดรับยศ / ถ้ามียศแล้วกดซ้ำจะเป็นการเอายศออก',
            '• **Verify:** กดยืนยันรับยศครั้งเดียว ถ้ามียศอยู่แล้วกดซ้ำจะไม่เอายศออก'
          ].join('\n')
        }
      )
      .setFooter({ text: 'XSTOREHUB-ROLE • สร้างและดูแลอย่างมืออาชีพ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
