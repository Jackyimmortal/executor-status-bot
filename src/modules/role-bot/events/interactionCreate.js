'use strict';

const logger = require('../utils/logger');
const { commandsCollection } = require('../commands');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, { db }) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = commandsCollection.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, { db });
      } catch (err) {
        logger.error(`Error executing /${interaction.commandName}:`, err.stack || err.message);
        const reply = {
          content: `❌ เกิดข้อผิดพลาดในการทำงาน: \`${err.message}\``,
          ephemeral: true
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Role Button Clicks
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('btn_role_')) return;

      const buttonRecord = db.getButtonByCustomId(interaction.customId);
      let roleId = buttonRecord ? buttonRecord.role_id : null;
      let mode = buttonRecord ? buttonRecord.mode : 'TOGGLE';

      // Fallback: Parse from customId if DB was reset
      // format: btn_role_<roleId>_<timestamp> or btn_role_<mode>_<roleId>_<timestamp>
      if (!roleId && interaction.customId.startsWith('btn_role_')) {
        const parts = interaction.customId.split('_');
        if (parts.length >= 4 && (parts[2] === 'TOGGLE' || parts[2] === 'VERIFY')) {
          mode = parts[2];
          roleId = parts[3];
        } else if (parts.length >= 3) {
          roleId = parts[2];
        }
      }

      if (!roleId) {
        return interaction.reply({
          content: '⚠️ ไม่พบข้อมูลปุ่มนี้ในระบบ กรุณาสร้างแผงใหม่ด้วยคำสั่ง `/role-panel`',
          ephemeral: true
        });
      }

      const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

      if (!role) {
        return interaction.reply({
          content: '❌ ไม่พบยศนี้ในเซิร์ฟเวอร์ (ยศอาจถูกลบไปแล้ว กรุณาแจ้งแอดมิน)',
          ephemeral: true
        });
      }

      // Role Hierarchy check
      const botMember = interaction.guild.members.me;
      if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({
          content: `⚠️ **บอทไม่มีสิทธิ์ให้ยศนี้**: ยศ **@${role.name}** อยู่สูงกว่ายศของบอท กรุณาแจ้งแอดมินให้ลากยศบอทขึ้นไปสูงกว่าครับ`,
          ephemeral: true
        });
      }

      const hasRole = interaction.member.roles.cache.has(roleId);

      try {
        if (hasRole) {
          if (buttonRecord.mode === 'VERIFY') {
            return interaction.reply({
              content: `ℹ️ คุณมีบทบาท ${role} อยู่แล้วครับ`,
              ephemeral: true
            });
          }

          // Toggle Mode: Remove Role
          await interaction.member.roles.remove(role);
          return interaction.reply({
            content: `🗑️ **นำยศออกสำเร็จ:** ถอดยศ ${role} ออกจากคุณเรียบร้อยแล้ว`,
            ephemeral: true
          });
        } else {
          // Add Role
          await interaction.member.roles.add(role);
          return interaction.reply({
            content: `🎉 **รับยศสำเร็จ:** มอบยศ ${role} ให้คุณเรียบร้อยแล้ว!`,
            ephemeral: true
          });
        }
      } catch (err) {
        logger.error(`Failed to assign role ${roleId} to member ${interaction.user.id}:`, err.message);
        return interaction.reply({
          content: `❌ เกิดข้อผิดพลาดในการมอบยศ: \`${err.message}\``,
          ephemeral: true
        });
      }
    }
  }
};
