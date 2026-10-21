'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');
const { STATUS, SECURITY_STATUS, PLATFORM, PRICE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-status')
    .setDescription('Set or update an administrator manual status record for an executor')
    .addStringOption(option =>
      option.setName('executor')
        .setDescription('Name or canonical ID of the executor')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('platform')
        .setDescription('Operating system platform')
        .setRequired(true)
        .addChoices(
          { name: 'Windows', value: PLATFORM.WINDOWS },
          { name: 'Android', value: PLATFORM.ANDROID },
          { name: 'iOS', value: PLATFORM.IOS },
          { name: 'Other', value: PLATFORM.OTHER }
        )
    )
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Update status')
        .setRequired(true)
        .addChoices(
          { name: 'UPDATED', value: STATUS.UPDATED },
          { name: 'OUTDATED', value: STATUS.OUTDATED },
          { name: 'UNKNOWN', value: STATUS.UNKNOWN },
          { name: 'STALE', value: STATUS.STALE },
          { name: 'CONFLICT', value: STATUS.CONFLICT }
        )
    )
    .addStringOption(option =>
      option.setName('security_status')
        .setDescription('Security detection status')
        .setRequired(false)
        .addChoices(
          { name: 'UNDETECTED', value: SECURITY_STATUS.UNDETECTED },
          { name: 'DETECTED', value: SECURITY_STATUS.DETECTED },
          { name: 'UNKNOWN', value: SECURITY_STATUS.UNKNOWN }
        )
    )
    .addStringOption(option =>
      option.setName('version')
        .setDescription('Executor version string (e.g. 2.5.4)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('price')
        .setDescription('Pricing model')
        .setRequired(false)
        .addChoices(
          { name: 'FREE', value: PRICE.FREE },
          { name: 'PAID', value: PRICE.PAID },
          { name: 'UNKNOWN', value: PRICE.UNKNOWN }
        )
    )
    .addNumberOption(option =>
      option.setName('sunc')
        .setDescription('sUNC test percentage (0 - 100)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addNumberOption(option =>
      option.setName('unc')
        .setDescription('UNC test percentage (0 - 100)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('decompiler')
        .setDescription('Decompiler supported')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('multi')
        .setDescription('Multi-instance supported')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { executorRepo, manualRepo, auditService, panelService, client } = context;

    const target = interaction.options.getString('executor');
    const platform = interaction.options.getString('platform');
    const status = interaction.options.getString('status');
    const securityStatus = interaction.options.getString('security_status') || SECURITY_STATUS.UNKNOWN;
    const version = interaction.options.getString('version');
    const price = interaction.options.getString('price') || PRICE.UNKNOWN;
    const sunc = interaction.options.getNumber('sunc');
    const unc = interaction.options.getNumber('unc');
    const decompiler = interaction.options.getBoolean('decompiler');
    const multi = interaction.options.getBoolean('multi');

    const executor = executorRepo.findByNameOrAlias(target);
    if (!executor) {
      return interaction.reply({
        content: `❌ Could not find executor matching **"${target}"**.`,
        ephemeral: true
      });
    }

    try {
      const record = manualRepo.upsert({
        executorId: executor.id,
        platform,
        status,
        securityStatus,
        version: version || null,
        price,
        suncPercentage: sunc !== null ? sunc : undefined,
        uncPercentage: unc !== null ? unc : undefined,
        decompilerEnabled: decompiler !== null ? decompiler : undefined,
        multiEnabled: multi !== null ? multi : undefined,
        updatedBy: `${interaction.user.tag} (${interaction.user.id})`
      });

      auditService.log(interaction.user.id, 'MANUAL_STATUS_UPDATE', executor.id, {
        platform,
        status,
        securityStatus,
        version,
        price,
        sunc,
        unc,
        decompiler,
        multi
      });

      panelService.refreshAllPanels(client).catch(() => {});

      await interaction.reply({
        content: `✅ Successfully saved manual status for **${executor.display_name}** on **${platform}** (Status: \`${status}\`, Security: \`${securityStatus}\`).\n*(Note: Manual records are explicitly marked as administrator maintained and never labeled as API-verified).*`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ Error saving manual status: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};
