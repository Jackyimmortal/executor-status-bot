'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PROVIDERS } = require('../../utils/constants');

function formatUptime(uptimeSeconds) {
  const d = Math.floor(uptimeSeconds / (3600 * 24));
  const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const s = Math.floor(uptimeSeconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-health')
    .setDescription('Display comprehensive health metrics for Discord, SQLite, and external APIs'),

  async execute(interaction, context) {
    const {
      executorRepo,
      snapshotRepo,
      manualRepo,
      healthRepo,
      panelRepo,
      statusService,
      client
    } = context;

    const uptimeStr = formatUptime(process.uptime());
    const discordPing = client && client.ws ? `${client.ws.ping}ms` : 'N/A';
    const totalExecutors = executorRepo.getAll().length;
    const totalSnapshots = snapshotRepo.count();
    const totalManual = manualRepo.count();
    const totalConflicts = statusService.getAllConflicts().length;
    const panels = panelRepo.getAll();
    const lastPanelRefresh = panels.length > 0 ? `<t:${Math.floor(new Date(panels[0].updated_at).getTime() / 1000)}:R>` : 'Never';

    const primaryHealth = healthRepo.getHealth(PROVIDERS.PRIMARY);
    const secondaryHealth = healthRepo.getHealth(PROVIDERS.SECONDARY);

    function formatProviderHealth(h) {
      if (!h) return '⚪ Never Polled';
      const lastSuccess = h.last_success_at ? `<t:${Math.floor(new Date(h.last_success_at).getTime() / 1000)}:R>` : 'Never';
      const lastFail = h.last_failure_at ? `<t:${Math.floor(new Date(h.last_failure_at).getTime() / 1000)}:R>` : 'None';
      const statusIcon = !h.last_failure_at || (h.last_success_at && h.last_success_at >= h.last_failure_at) ? '🟢 Healthy' : '🔴 Failing';
      const errorStr = h.last_error_message ? `\n  Error: \`${h.last_error_message.slice(0, 80)}\`` : '';
      return `${statusIcon}\n  Success: ${lastSuccess}\n  Failure: ${lastFail}${errorStr}`;
    }

    const embed = new EmbedBuilder()
      .setColor(totalConflicts > 0 ? 0xE67E22 : 0x57F287)
      .setTitle('📊 System Health & Diagnostics')
      .setDescription(`Current runtime and connectivity statistics as of <t:${Math.floor(Date.now() / 1000)}:T>`)
      .addFields(
        {
          name: '🤖 Discord Bot',
          value: `Status: 🟢 **Connected**\nUptime: \`${uptimeStr}\`\nGateway Ping: \`${discordPing}\`\nActive Panels: \`${panels.length}\` (Last refreshed: ${lastPanelRefresh})`,
          inline: false
        },
        {
          name: '💾 Database (SQLite)',
          value: `Status: 🟢 **Connected** (WAL Mode)\nRegistered Executors: \`${totalExecutors}\`\nAPI Snapshots: \`${totalSnapshots}\`\nManual Records: \`${totalManual}\`\nActive Conflicts: \`${totalConflicts}\``,
          inline: false
        },
        {
          name: `🌐 Primary API (${PROVIDERS.PRIMARY})`,
          value: formatProviderHealth(primaryHealth),
          inline: false
        },
        {
          name: `🌐 Secondary API (${PROVIDERS.SECONDARY})`,
          value: formatProviderHealth(secondaryHealth),
          inline: false
        }
      )
      .setFooter({ text: 'Executor Status Bot • Health Monitor' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
