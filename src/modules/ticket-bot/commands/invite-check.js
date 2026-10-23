'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('ตรวจสอบจำนวนคนที่คุณเชิญเข้าเซิร์ฟเวอร์')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('เลือกดูยอดเชิญของสมาชิกคนอื่น (ถ้าไม่เลือกจะดูของตัวเอง)')
        .setRequired(false)
    ),

  async execute(interaction, { db }) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const invites = db.getInvites(interaction.guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📨 สถิติการเชิญเพื่อน • ${targetUser.username}`)
      .setDescription(
        `คุณ <@${targetUser.id}> มียอดเชิญเพื่อนเข้าเซิร์ฟเวอร์ทั้งหมด **${invites.total}** คน!`
      )
      .addFields(
        { name: '✅ เชิญจริง', value: `\`${invites.regular}\` คน`, inline: true },
        { name: '🎁 โบนัสพิเศษ', value: `\`${invites.bonus}\` คน`, inline: true },
        { name: '🚪 คนที่ออกไป', value: `\`${invites.leftCount}\` คน`, inline: true },
        { name: '🔥 ยอดสุทธิรวม', value: `\`${invites.total}\` คน`, inline: false }
      )
      .setFooter({ text: 'XSTOREHUB • ระบบนับยอดเชิญอัตโนมัติ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
