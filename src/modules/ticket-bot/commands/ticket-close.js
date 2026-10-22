'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('ปิดห้องทิกเก็ตปัจจุบัน'),

  async execute(interaction, { db }) {
    const channel = interaction.channel;
    const ticket = db.getTicketByChannelId(channel.id);

    if (!ticket) {
      return interaction.reply({
        content: '❌ **คำสั่งนี้สามารถใช้ได้เฉพาะในห้องทิกเก็ตเท่านั้นครับ**',
        ephemeral: true
      });
    }

    if (ticket.status === 'CLOSED') {
      return interaction.reply({
        content: '⚠️ ทิกเก็ตนี้ถูกปิดไปแล้วครับ',
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_ticket_confirm_close')
        .setLabel('ยืนยันปิดทิกเก็ต')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('btn_ticket_cancel_close')
        .setLabel('ยกเลิก')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔒 ยืนยันการปิดทิกเก็ต')
      .setDescription('คุณต้องการปิดห้องทิกเก็ตนี้ใช่หรือไม่? หลังจากปิดแล้วห้องจะถูกล็อกการส่งข้อความ');

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
