'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');
const { PROVIDERS } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-provider')
    .setDescription('Display API provider configuration, endpoints, and health telemetry'),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { providerManager, healthRepo } = context;

    const primaryProvider = providerManager.getProvider(PROVIDERS.PRIMARY);
    const secondaryProvider = providerManager.getProvider(PROVIDERS.SECONDARY);

    const primaryHealth = healthRepo.getHealth(PROVIDERS.PRIMARY);
    const secondaryHealth = healthRepo.getHealth(PROVIDERS.SECONDARY);

    function formatDetails(prov, health) {
      const enabled = prov.config.enabled ? '🟢 Enabled' : '🔴 Disabled';
      const url = prov.config.url || 'Not configured';
      const timeout = `${prov.config.timeoutMs}ms`;
      const auth = prov.config.key ? 'Bearer (Configured)' : 'None (Public API)';

      let healthStr = 'No health records yet.';
      if (health) {
        const lastSuccess = health.last_success_at ? `<t:${Math.floor(new Date(health.last_success_at).getTime() / 1000)}:R>` : 'Never';
        const lastFail = health.last_failure_at ? `<t:${Math.floor(new Date(health.last_failure_at).getTime() / 1000)}:R>` : 'None';
        const err = health.last_error_message ? `\n• Last Error: \`${health.last_error_message}\`` : '';
        healthStr = `• Last Success: ${lastSuccess}\n• Last Attempt: <t:${Math.floor(new Date(health.last_attempt_at || Date.now()).getTime() / 1000)}:R>\n• Last Failure: ${lastFail}${err}`;
      }

      return `**Status:** ${enabled}\n**Endpoint:** \`${url}\`\n**Auth:** \`${auth}\` | **Timeout:** \`${timeout}\`\n**Telemetry:**\n${healthStr}`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🌐 External API Provider Configuration & Health')
      .addFields(
        {
          name: `1. Primary Provider: ${PROVIDERS.PRIMARY}`,
          value: formatDetails(primaryProvider, primaryHealth),
          inline: false
        },
        {
          name: `2. Secondary Provider: ${PROVIDERS.SECONDARY}`,
          value: formatDetails(secondaryProvider, secondaryHealth),
          inline: false
        }
      )
      .setFooter({ text: 'API keys are strictly hidden from logs and embeds.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
