'use strict';

const {
  createStatusPanelEmbed,
  createStatusPanelComponents
} = require('../utils/embeds');
const logger = require('../utils/logger');

class PanelService {
  constructor(statusService, panelRepo) {
    this.statusService = statusService;
    this.panelRepo = panelRepo;
    // Map to hold in-memory UI pagination/filter state per panel messageId
    this.panelStates = new Map();
  }

  getPanelState(messageId) {
    if (!this.panelStates.has(messageId)) {
      this.panelStates.set(messageId, { page: 1, filter: 'ALL' });
    }
    return this.panelStates.get(messageId);
  }

  setPanelState(messageId, state) {
    const existing = this.getPanelState(messageId);
    this.panelStates.set(messageId, { ...existing, ...state });
  }

  /**
   * Creates or reconnects the persistent panel in a channel.
   */
  async createOrReconnectPanel(channel, guildId, options = {}) {
    const filter = options.filter || 'ALL';
    const page = options.page || 1;

    const platformFilter = filter === 'ALL' ? null : filter;
    const items = this.statusService.getAllResolvedStatuses(platformFilter);

    const { embed, currentPage, totalPages } = createStatusPanelEmbed(items, {
      page,
      pageSize: 6,
      filter
    });
    const components = createStatusPanelComponents(currentPage, totalPages, filter);

    const existingPanel = this.panelRepo.getByGuildAndChannel(guildId, channel.id);

    if (existingPanel) {
      try {
        const message = await channel.messages.fetch(existingPanel.message_id);
        if (message) {
          await message.edit({ embeds: [embed], components });
          this.setPanelState(message.id, { page: currentPage, filter });
          this.panelRepo.touch(existingPanel.id);
          logger.info(`Reconnected and updated existing status panel in ${channel.id}`);
          return { message, reconnected: true };
        }
      } catch (err) {
        if (err.code === 10008 || err.message?.includes('Unknown Message')) {
          logger.warn(`Previous panel message ${existingPanel.message_id} was deleted. Creating a new one.`);
        } else {
          logger.error(`Error fetching existing panel message: ${err.message}`);
        }
      }
    }

    // Send new panel message
    const newMessage = await channel.send({ embeds: [embed], components });
    this.panelRepo.upsert(guildId, channel.id, newMessage.id);
    this.setPanelState(newMessage.id, { page: currentPage, filter });
    logger.info(`Created new persistent status panel: message ${newMessage.id} in channel ${channel.id}`);
    return { message: newMessage, reconnected: false };
  }

  /**
   * Refreshes all active panels across all guilds.
   */
  async refreshAllPanels(client) {
    if (!client || !client.isReady()) {
      logger.debug('Cannot refresh panels: Discord client not ready.');
      return;
    }

    const panels = this.panelRepo.getAll();
    logger.debug(`Refreshing ${panels.length} status panels...`);

    for (const panel of panels) {
      try {
        const guild = await client.guilds.fetch(panel.guild_id).catch(() => null);
        if (!guild) continue;

        const channel = await guild.channels.fetch(panel.channel_id).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        const state = this.getPanelState(panel.message_id);
        const platformFilter = state.filter === 'ALL' ? null : state.filter;
        const items = this.statusService.getAllResolvedStatuses(platformFilter);

        const { embed, currentPage, totalPages } = createStatusPanelEmbed(items, {
          page: state.page,
          pageSize: 6,
          filter: state.filter
        });
        const components = createStatusPanelComponents(currentPage, totalPages, state.filter);

        const message = await channel.messages.fetch(panel.message_id).catch(() => null);
        if (message) {
          await message.edit({ embeds: [embed], components });
          this.panelRepo.touch(panel.id);
        } else {
          logger.warn(`Panel message ${panel.message_id} not found in channel ${panel.channel_id}.`);
        }
      } catch (err) {
        logger.error(`Failed to refresh panel ${panel.id}:`, err.message);
      }
    }
  }

  /**
   * Handles component button clicks on the panel.
   */
  async handlePanelInteraction(interaction) {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;

    if (!customId.startsWith('panel_')) return;

    const messageId = interaction.message.id;
    const state = this.getPanelState(messageId);

    if (customId.startsWith('panel_filter_')) {
      const newFilter = customId.replace('panel_filter_', '');
      state.filter = newFilter;
      state.page = 1; // Reset to first page on filter switch
    } else if (customId === 'panel_page_PREV') {
      state.page = Math.max(1, state.page - 1);
    } else if (customId === 'panel_page_NEXT') {
      state.page = state.page + 1;
    } else if (customId === 'panel_action_REFRESH') {
      // Trigger immediate background sync
      await this.statusService.syncProviders().catch(e => logger.warn('Sync on refresh error:', e.message));
    }

    const platformFilter = state.filter === 'ALL' ? null : state.filter;
    const items = this.statusService.getAllResolvedStatuses(platformFilter);

    const { embed, currentPage, totalPages } = createStatusPanelEmbed(items, {
      page: state.page,
      pageSize: 6,
      filter: state.filter
    });
    const components = createStatusPanelComponents(currentPage, totalPages, state.filter);

    this.setPanelState(messageId, { page: currentPage, filter: state.filter });

    await interaction.update({ embeds: [embed], components });
  }
}

module.exports = PanelService;
