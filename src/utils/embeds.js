'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const {
  STATUS,
  SECURITY_STATUS,
  STATUS_COLORS,
  STATUS_EMOJIS,
  SECURITY_EMOJIS
} = require('./constants');

/**
 * Formats a single executor status field block for embed display.
 */
function formatExecutorField(item) {
  const emoji = STATUS_EMOJIS[item.status] || '⚪';
  const secEmoji = SECURITY_EMOJIS[item.securityStatus] || '❓ Unknown';

  let title = `${emoji} **${item.displayName}** (${item.platform})`;
  if (item.version) {
    title += ` \`v${item.version}\``;
  }

  const lines = [];

  // Line 1: Status & Price & Security
  lines.push(`**Status:** \`${item.statusMessage || item.status}\` • **Price:** \`${item.price}\``);
  lines.push(`**Security:** ${secEmoji}`);

  // Line 2: Features (UNC, sUNC, Decompiler, Multi)
  const features = [];
  if (item.uncPercentage !== null) features.push(`UNC: \`${item.uncPercentage}%\``);
  if (item.suncPercentage !== null) features.push(`sUNC: \`${item.suncPercentage}%\``);
  if (item.decompilerEnabled !== null) features.push(`Decompiler: \`${item.decompilerEnabled ? 'Yes' : 'No'}\``);
  if (item.multiEnabled !== null) features.push(`Multi: \`${item.multiEnabled ? 'Yes' : 'No'}\``);

  if (features.length > 0) {
    lines.push(`**Features:** ${features.join(' | ')}`);
  }

  // Line 3: Source and retrieval metadata
  let sourceLabel = item.source || 'UNKNOWN';
  if (item.isManual) {
    sourceLabel = '⚠️ Manually Maintained (Admin)';
  } else {
    sourceLabel = `Verified API (${item.source})`;
  }
  lines.push(`**Source:** ${sourceLabel}`);

  if (item.lastRetrieval) {
    const timestampSec = Math.floor(new Date(item.lastRetrieval).getTime() / 1000);
    lines.push(`**Last Checked:** <t:${timestampSec}:R>`);
  } else if (item.lastModified) {
    const timestampSec = Math.floor(new Date(item.lastModified).getTime() / 1000);
    lines.push(`**Updated:** <t:${timestampSec}:R>`);
  }

  if (item.hasConflict && item.conflictDetails) {
    lines.push(`⚠️ **Conflict:** ${item.conflictDetails}`);
  }

  return {
    name: title,
    value: lines.join('\n') + '\n\u200B',
    inline: false
  };
}

/**
 * Builds the paginated Status Panel embed.
 */
function createStatusPanelEmbed(items, options = {}) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 6;
  const filter = options.filter || 'ALL';
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  // Overall status summary count
  const updatedCount = items.filter(i => i.status === STATUS.UPDATED).length;
  const outdatedCount = items.filter(i => i.status === STATUS.OUTDATED).length;
  const conflictCount = items.filter(i => i.status === STATUS.CONFLICT).length;
  const notFoundCount = items.filter(i => i.status === STATUS.NOT_FOUND).length;

  // Determine embed primary color
  let embedColor = 0x2B2D31; // Default dark
  if (conflictCount > 0) embedColor = STATUS_COLORS[STATUS.CONFLICT];
  else if (outdatedCount > 0) embedColor = STATUS_COLORS[STATUS.OUTDATED];
  else if (updatedCount > 0) embedColor = STATUS_COLORS[STATUS.UPDATED];

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle('⚡ ROBLOX EXECUTOR STATUS MONITOR')
    .setDescription(
      `Real-time status tracking across primary & secondary API feeds with manual admin oversight.\n\n` +
      `🟢 **Updated:** \`${updatedCount}\` | 🔴 **Outdated:** \`${outdatedCount}\` | ` +
      `⚠️ **Conflicts:** \`${conflictCount}\` | ❓ **Unresolved:** \`${notFoundCount}\`\n` +
      `**Active Filter:** \`${filter}\` | **Total Tracked:** \`${totalItems}\``
    )
    .setTimestamp();

  if (pageItems.length === 0) {
    embed.addFields({
      name: 'No Executors Found',
      value: `No executors match the current filter \`${filter}\`.`,
      inline: false
    });
  } else {
    for (const item of pageItems) {
      embed.addFields(formatExecutorField(item));
    }
  }

  embed.setFooter({
    text: `Page ${currentPage}/${totalPages} • Security reports are third-party data; zero guarantees provided.`
  });

  return {
    embed,
    currentPage,
    totalPages
  };
}

/**
 * Builds action rows for the Status Panel (filters, pagination, refresh).
 */
function createStatusPanelComponents(currentPage, totalPages, activeFilter = 'ALL') {
  // Row 1: Platform Filters & Refresh
  const filterRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel_filter_ALL')
      .setLabel('All')
      .setStyle(activeFilter === 'ALL' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_filter_WINDOWS')
      .setLabel('Windows')
      .setEmoji('🪟')
      .setStyle(activeFilter === 'WINDOWS' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_filter_ANDROID')
      .setLabel('Android')
      .setEmoji('🤖')
      .setStyle(activeFilter === 'ANDROID' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_filter_IOS')
      .setLabel('iOS')
      .setEmoji('🍎')
      .setStyle(activeFilter === 'IOS' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_action_REFRESH')
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success)
  );

  // Row 2: Pagination controls
  const pageRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel_page_PREV')
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId('panel_page_INDICATOR')
      .setLabel(`Page ${currentPage} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('panel_page_NEXT')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages)
  );

  return [filterRow, pageRow];
}

/**
 * Detailed executor view embed for /executor-info.
 */
function createExecutorDetailEmbed(resolvedData) {
  const { executor, platforms } = resolvedData;
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`Executor Details: ${executor.display_name}`)
    .setDescription(`**Canonical ID:** \`${executor.canonical_name}\`\n**Registered Since:** <t:${Math.floor(new Date(executor.created_at).getTime() / 1000)}:f>`)
    .setTimestamp();

  for (const p of platforms) {
    embed.addFields(formatExecutorField(p));
  }

  embed.setFooter({
    text: 'Roblox Executor Status Bot • Information sourced from verified APIs & admin records.'
  });

  return embed;
}

module.exports = {
  formatExecutorField,
  createStatusPanelEmbed,
  createStatusPanelComponents,
  createExecutorDetailEmbed
};
