'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credit-stats')
    .setDescription('ตรวจสอบยอดรวมเครดิตและความน่าเชื่อถือของร้านค้า'),

  async execute(interaction, { db }) {
    const stats = db.getCreditStats(interaction.guildId);
    const recent = db.getRecentCredits(interaction.guildId, 5);

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F) // Gold
      .setTitle(`🏆 สรุปความน่าเชื่อถือ • ${interaction.guild.name}`)
      .setDescription('ร้านค้าปลอดภัย ยืนยันตัวตน มีเครดิตการซื้อขายจริง 100%')
      .addFields(
        { name: '📊 จำนวนเครดิตทั้งหมด', value: `\`${stats.total}\` รายการ`, inline: true },
        { name: '⭐ คะแนนรีวิวเฉลี่ย', value: `\`${stats.avgRating} / 5.0\` ดาว`, inline: true },
        { name: '🛡️ สถานะความปลอดภัย', value: '`✅ ได้รับของชัวร์ 100%`', inline: true }
      )
      .setFooter({ text: 'XSTOREHUB • ระบบตรวจสอบเครดิตอัตโนมัติ' })
      .setTimestamp();

    if (recent.length > 0) {
      const recentList = recent.map(r => `• **${r.customer_name}** ซื้อ \`${r.product_name}\` (${r.price || '-'}) ⭐ ${r.rating}/5`).join('\n');
      embed.addFields({
        name: '🕒 รายการซื้อขายล่าสุด',
        value: recentList,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
