'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-list')
    .setDescription('ดูรายการแผงรับยศทั้งหมดที่สร้างไว้ในเซิร์ฟเวอร์')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),

  async execute(interaction, { db }) {
    const panels = db.getAllPanels(interaction.guildId);

    if (panels.length === 0) {
      return interaction.reply({
        content: '📋 ยังไม่มีการสร้างแผงรับยศในเซิร์ฟเวอร์นี้ ใช้คำสั่ง `/role-panel` เพื่อสร้างได้เลยครับ',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 รายการแผงรับยศในเซิร์ฟเวอร์')
      .setDescription(`พบแผงรับยศทั้งหมด **${panels.length}** แผง:`)
      .setTimestamp();

    for (const p of panels) {
      embed.addFields({
        name: `📌 ${p.title} (ID: ${p.id})`,
        value: `• **ห้อง:** <#${p.channel_id}>\n• **Message ID:** \`${p.message_id}\`\n• **จำนวนปุ่ม:** \`${p.button_count}\` ปุ่ม\n• **สร้างเมื่อ:** <t:${Math.floor(new Date(p.created_at).getTime() / 1000)}:R>`,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
