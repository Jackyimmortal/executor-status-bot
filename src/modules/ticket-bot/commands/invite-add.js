'use strict';

const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-add')
    .setDescription('⚡ ปั้ม/เพิ่มยอดการเชิญเพื่อนให้กับสมาชิกหรือแอดมิน')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('สมาชิกที่ต้องการเพิ่มยอดเชิญให้')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('จำนวนยอดเชิญที่ต้องการเพิ่ม (เช่น 5, 10, 50, 100)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('เหตุผลในการเพิ่มยอดเชิญ (ถ้ามี)')
        .setRequired(false)
    ),

  async execute(interaction, { db }) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'แอดมินเพิ่มยอดให้';

    const updated = db.addBonusInvites(interaction.guildId, targetUser.id, amount);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('⚡ ปั้มยอดเชิญสำเร็จ!')
      .setDescription(
        `ทำการเพิ่มยอดเชิญให้คุณ <@${targetUser.id}> จำนวน **+${amount}** คน เรียบร้อยแล้วครับ!`
      )
      .addFields(
        { name: '👤 สมาชิก', value: `<@${targetUser.id}>`, inline: true },
        { name: '➕ ยอดที่เพิ่ม', value: `\`+${amount}\` คน`, inline: true },
        { name: '🔥 ยอดสุทธิรวมตอนนี้', value: `\`${updated.total}\` คน`, inline: true },
        { name: '📝 เหตุผล', value: `\`${reason}\``, inline: false }
      )
      .setFooter({ text: 'XSTOREHUB • ระบบจัดการยอดเชิญ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
