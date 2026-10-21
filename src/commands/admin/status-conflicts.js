'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-conflicts')
    .setDescription('Display all detected data contradictions between API and manual sources'),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { statusService } = context;
    const conflicts = statusService.getAllConflicts();

    if (conflicts.length === 0) {
      return interaction.reply({
        content: '✅ **No Conflicts**: All data sources (Primary API, Secondary API, Manual) are in complete agreement.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`⚠️ Active Contradictions Detected (${conflicts.length})`)
      .setDescription('The following executors have conflicting status values between different sources:')
      .setTimestamp();

    for (const c of conflicts) {
      const pSnapshot = c.snapshots?.primary;
      const sSnapshot = c.snapshots?.secondary;
      const manual = c.manualRecord;

      const pStatus = pSnapshot ? `\`${pSnapshot.status}\` (v${pSnapshot.version || '?'})` : '*None*';
      const sStatus = sSnapshot ? `\`${sSnapshot.status}\` (v${sSnapshot.version || '?'})` : '*None*';
      const mStatus = manual ? `\`${manual.status}\` (by ${manual.updated_by})` : '*None*';

      embed.addFields({
        name: `**${c.displayName}** (${c.platform})`,
        value: `**Conflict Detail:** ${c.conflictDetails || 'Statuses differ'}\n` +
          `• **Primary API:** ${pStatus}\n` +
          `• **Secondary API:** ${sStatus}\n` +
          `• **Manual Override:** ${mStatus}`,
        inline: false
      });
    }

    embed.setFooter({ text: 'Use /executor-status to manually enforce an authoritative status if needed.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
