'use strict';

const {
  SlashCommandBuilder,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-remove')
    .setDescription('นำสมาชิกออกจากห้องทิกเก็ตนี้')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('สมาชิกที่ต้องการนำออกจากห้อง')
        .setRequired(true)
    ),

  async execute(interaction, { db }) {
    const channel = interaction.channel;
    const ticket = db.getTicketByChannelId(channel.id);

    if (!ticket) {
      return interaction.reply({
        content: '❌ **คำสั่งนี้สามารถใช้ได้เฉพาะในห้องทิกเก็ตเท่านั้นครับ**',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('user');

    if (targetUser.id === ticket.user_id) {
      return interaction.reply({
        content: '⚠️ ไม่สามารถนำเจ้าของทิกเก็ตออกจากห้องได้ครับ',
        ephemeral: true
      });
    }

    try {
      await channel.permissionOverwrites.delete(targetUser.id);

      await interaction.reply({
        content: `👋 นำคุณ <@${targetUser.id}> ออกจากห้องทิกเก็ตเรียบร้อยแล้วครับ`
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ เกิดข้อผิดพลาดในการนำสมาชิกออก: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};
