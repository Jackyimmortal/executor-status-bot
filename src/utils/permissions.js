'use strict';

const { PermissionsBitField } = require('discord.js');
const { config } = require('../config/config');
const logger = require('./logger');

/**
 * Checks whether the member executing the interaction has admin privileges.
 * Checks:
 * 1. Guild ownership or Administrator permission
 * 2. ManageGuild permission
 * 3. Specific ADMIN_ROLE_ID configured in .env
 */
function isUserAdmin(interaction) {
  if (!interaction || !interaction.member) {
    return false;
  }

  // Guild owners are always admin
  if (interaction.guild && interaction.guild.ownerId === interaction.user.id) {
    return true;
  }

  const memberPermissions = interaction.memberPermissions || interaction.member.permissions;

  // Check Administrator permission
  if (memberPermissions && typeof memberPermissions.has === 'function') {
    if (memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return true;
    }
    if (memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return true;
    }
  }

  // Check ADMIN_ROLE_ID
  const adminRoleId = config.discord.adminRoleId;
  if (adminRoleId && interaction.member.roles) {
    if (Array.isArray(interaction.member.roles)) {
      if (interaction.member.roles.includes(adminRoleId)) return true;
    } else if (typeof interaction.member.roles.cache?.has === 'function') {
      if (interaction.member.roles.cache.has(adminRoleId)) return true;
    }
  }

  return false;
}

/**
 * Guard middleware for admin commands.
 * Replies with an ephemeral error message if unauthorized.
 */
async function requireAdmin(interaction) {
  if (!isUserAdmin(interaction)) {
    logger.warn(`Unauthorized admin command attempt by user ${interaction.user?.id} (${interaction.user?.tag})`);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: '⛔ **Access Denied**: You do not have permission to execute this administrative command.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '⛔ **Access Denied**: You do not have permission to execute this administrative command.',
        ephemeral: true
      });
    }
    return false;
  }
  return true;
}

module.exports = {
  isUserAdmin,
  requireAdmin
};
