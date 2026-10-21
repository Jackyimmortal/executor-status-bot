'use strict';

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-remove')
    .setDescription('Delete an executor and all associated snapshots and manual records')
    .addStringOption(option =>
      option.setName('executor')
        .setDescription('Name or canonical ID of the executor to remove')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { executorRepo, auditService, panelService, client } = context;
    const target = interaction.options.getString('executor');

    const existing = executorRepo.findByNameOrAlias(target);
    if (!existing) {
      return interaction.reply({
        content: `❌ Could not find executor matching **"${target}"**.`,
        ephemeral: true
      });
    }

    const confirmCustomId = `confirm_remove_${existing.id}_${Date.now()}`;
    const cancelCustomId = `cancel_remove_${existing.id}_${Date.now()}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmCustomId)
        .setLabel('Yes, Delete Executor')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(cancelCustomId)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    const promptMessage = await interaction.reply({
      content: `⚠️ **Confirmation Required**: Are you sure you want to permanently delete **${existing.display_name}** (\`${existing.canonical_name}\`)? This will also delete all stored snapshots and manual overrides.`,
      components: [row],
      ephemeral: true,
      fetchReply: true
    });

    const collector = promptMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      filter: (i) => i.user.id === interaction.user.id
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId === confirmCustomId) {
        try {
          executorRepo.delete(existing.id);

          auditService.log(interaction.user.id, 'EXECUTOR_DELETE', existing.id, {
            canonical: existing.canonical_name,
            displayName: existing.display_name
          });

          panelService.refreshAllPanels(client).catch(() => {});

          await btnInteraction.update({
            content: `✅ Successfully deleted executor **${existing.display_name}** and associated data.`,
            components: []
          });
        } catch (err) {
          await btnInteraction.update({
            content: `❌ Error deleting executor: \`${err.message}\``,
            components: []
          });
        }
      } else {
        await btnInteraction.update({
          content: '❌ Deletion cancelled by administrator.',
          components: []
        });
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await interaction.editReply({
          content: '⏱️ Deletion prompt timed out. No changes were made.',
          components: []
        }).catch(() => {});
      }
    });
  }
};
