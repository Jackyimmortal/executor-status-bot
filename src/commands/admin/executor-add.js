'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-add')
    .setDescription('Register a new Roblox executor for status tracking')
    .addStringOption(option =>
      option.setName('canonical_name')
        .setDescription('Unique canonical slug (e.g. electron, synapse, krnl)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('display_name')
        .setDescription('Official display name (e.g. Electron, Krnl)')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { executorRepo, auditService, panelService, client } = context;
    const rawCanonical = interaction.options.getString('canonical_name').trim().toLowerCase().replace(/\s+/g, '_');
    const displayName = interaction.options.getString('display_name').trim();

    if (!rawCanonical || !displayName) {
      return interaction.reply({
        content: '❌ Invalid names provided. Please supply valid non-empty names.',
        ephemeral: true
      });
    }

    const existing = executorRepo.getByCanonical(rawCanonical);
    if (existing) {
      return interaction.reply({
        content: `❌ An executor with canonical name \`${rawCanonical}\` already exists (Display: **${existing.display_name}**).`,
        ephemeral: true
      });
    }

    try {
      const created = executorRepo.create(rawCanonical, displayName);
      auditService.log(interaction.user.id, 'EXECUTOR_ADD', created.id, {
        canonical: rawCanonical,
        display: displayName
      });

      // Refresh panel in background
      panelService.refreshAllPanels(client).catch(() => {});

      await interaction.reply({
        content: `✅ Registered new executor **${displayName}** (\`${rawCanonical}\`, ID: \`${created.id}\`).`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ Failed to register executor: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};
