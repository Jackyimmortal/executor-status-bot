'use strict';

const {
  SlashCommandBuilder,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('เพิ่มสมาชิกคนอื่นเข้ามาร่วมพูดคุยในห้องทิกเก็ตนี้')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('สมาชิกที่ต้องการเพิ่มเข้ามาในห้องทิกเก็ต')
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

    try {
      await channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });

      await interaction.reply({
        content: `✅ เพิ่มคุณ <@${targetUser.id}> เข้ามาในห้องทิกเก็ตเรียบร้อยแล้วครับ!`
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ เกิดข้อผิดพลาดในการเพิ่มสมาชิก: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};
