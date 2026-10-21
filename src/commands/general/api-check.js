'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { REQUESTED_EXECUTORS, PROVIDERS } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('api-check')
    .setDescription('Check presence and fields for all 11 requested executors across external APIs'),

  async execute(interaction, context) {
    await interaction.deferReply();
    const { executorRepo, snapshotRepo, healthRepo } = context;

    const primaryHealth = healthRepo.getHealth(PROVIDERS.PRIMARY);
    const secondaryHealth = healthRepo.getHealth(PROVIDERS.SECONDARY);

    const primaryHasError = Boolean(primaryHealth?.last_failure_at && (!primaryHealth.last_success_at || primaryHealth.last_failure_at > primaryHealth.last_success_at));
    const secondaryHasError = Boolean(secondaryHealth?.last_failure_at && (!secondaryHealth.last_success_at || secondaryHealth.last_failure_at > secondaryHealth.last_success_at));

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔍 API Verification Report (11 Requested Executors)')
      .setDescription(
        `Auditing availability across **Primary API** (\`${PROVIDERS.PRIMARY}\`) and **Secondary API** (\`${PROVIDERS.SECONDARY}\`):\n` +
        `• **YES**: Verified present in latest API snapshot\n` +
        `• **NO (NOT FOUND)**: API responded successfully, but executor is absent\n` +
        `• **ERROR**: API endpoint unreachable or returned an error`
      )
      .setTimestamp();

    let primaryFoundCount = 0;
    let secondaryFoundCount = 0;

    for (const target of REQUESTED_EXECUTORS) {
      const exec = executorRepo.getByCanonical(target.canonical);
      let pStatus = 'NO';
      let sStatus = 'NO';
      const details = [];

      if (exec) {
        const snapshots = snapshotRepo.getByExecutorId(exec.id);

        const pSnapshots = snapshots.filter(s => s.provider_name === PROVIDERS.PRIMARY);
        const sSnapshots = snapshots.filter(s => s.provider_name === PROVIDERS.SECONDARY);

        if (pSnapshots.length > 0) {
          pStatus = 'YES';
          primaryFoundCount++;
          const platforms = pSnapshots.map(s => s.platform).join(', ');
          const fields = [];
          if (pSnapshots[0].version) fields.push('version');
          if (pSnapshots[0].unc_percentage !== null) fields.push('UNC');
          if (pSnapshots[0].sunc_percentage !== null) fields.push('sUNC');
          if (pSnapshots[0].decompiler_enabled !== null) fields.push('decompiler');
          details.push(`• **Primary**: Found on [${platforms}] | Fields: \`${fields.join(', ') || 'basic'}\``);
        } else if (primaryHasError) {
          pStatus = 'ERROR';
        }

        if (sSnapshots.length > 0) {
          sStatus = 'YES';
          secondaryFoundCount++;
          const platforms = sSnapshots.map(s => s.platform).join(', ');
          const fields = [];
          if (sSnapshots[0].version) fields.push('version');
          if (sSnapshots[0].unc_percentage !== null) fields.push('UNC');
          if (sSnapshots[0].sunc_percentage !== null) fields.push('sUNC');
          if (sSnapshots[0].decompiler_enabled !== null) fields.push('decompiler');
          details.push(`• **Secondary**: Found on [${platforms}] | Fields: \`${fields.join(', ') || 'basic'}\``);
        } else if (secondaryHasError) {
          sStatus = 'ERROR';
        }
      } else {
        if (primaryHasError) pStatus = 'ERROR';
        if (secondaryHasError) sStatus = 'ERROR';
      }

      if (details.length === 0) {
        details.push('• *Not present in any active external API response.*');
      }

      const badgeP = pStatus === 'YES' ? '🟢 YES' : (pStatus === 'ERROR' ? '🔴 ERROR' : '⚪ NOT FOUND');
      const badgeS = sStatus === 'YES' ? '🟢 YES' : (sStatus === 'ERROR' ? '🔴 ERROR' : '⚪ NOT FOUND');

      embed.addFields({
        name: `${target.displayName} (Canonical: \`${target.canonical}\`)`,
        value: `**Primary:** ${badgeP} | **Secondary:** ${badgeS}\n${details.join('\n')}`,
        inline: false
      });
    }

    embed.setFooter({
      text: `Summary: Primary found ${primaryFoundCount}/11 • Secondary found ${secondaryFoundCount}/11`
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
