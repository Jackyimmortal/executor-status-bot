'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-top')
    .setDescription('ดูตารางอันดับผู้ที่เชิญคนเข้าเซิร์ฟเวอร์มากที่สุด (Top 10)'),

  async execute(interaction, { db }) {
    const leaderboard = db.getInviteLeaderboard(interaction.guildId, 10);

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F) // Gold
      .setTitle(`🏆 ตารางอันดับคนเชิญเพื่อนสูงสุด • ${interaction.guild.name}`)
      .setDescription('ขอบคุณสมาชิกทุกคนที่ช่วยกันโปรโมตและแนะนำเพื่อนเข้าสู่ XSTOREHUB ครับ! 🎉')
      .setFooter({ text: 'XSTOREHUB • ระบบจัดอันดับการเชิญ' })
      .setTimestamp();

    if (leaderboard.length === 0) {
      embed.setDescription('ยังไม่มีข้อมูลการเชิญเพื่อนในเซิร์ฟเวอร์ครับ เริ่มเชิญคนเข้าดิสได้เลย!');
    } else {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const lines = leaderboard.map((item, index) => {
        const medal = medals[index] || `${index + 1}.`;
        return `${medal} <@${item.user_id}> — **${item.total}** คน *(เชิญจริง: ${item.regular} | โบนัส: ${item.bonus})*`;
      });

      embed.addFields({
        name: '👑 ผู้เชิญสูงสุด 10 อันดับแรก',
        value: lines.join('\n'),
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
