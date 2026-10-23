'use strict';

const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-set-number')
    .setDescription('⚙️ กำหนดเลขเริ่มต้นของทิกเก็ตต่อไป (เช่น ตั้งเป็น 3590)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('เลขของทิกเก็ตต่อไปที่จะถูกเปิด (เช่น 3590)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction, { db }) {
    const targetNumber = interaction.options.getInteger('number');

    db.setNextTicketNumber(interaction.guildId, targetNumber);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('⚙️ ตั้งค่าเลขทิกเก็ตสำเร็จ!')
      .setDescription(
        `กำหนดเลขทิกเก็ตต่อไปเรียบร้อยแล้ว!\n\n` +
        `• 🎫 ทิกเก็ตต่อไปที่จะถูกเปิดจะเป็น: **Tk #${targetNumber}** (ห้อง \`tk-${targetNumber}\`)`
      )
      .setFooter({ text: 'XSTOREHUB • ระบบจัดการทิกเก็ต' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
