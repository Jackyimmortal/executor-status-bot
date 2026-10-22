'use strict';

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');

const STYLE_MAP = {
  SUCCESS: ButtonStyle.Success,
  PRIMARY: ButtonStyle.Primary,
  SECONDARY: ButtonStyle.Secondary,
  DANGER: ButtonStyle.Danger
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('เพิ่มปุ่มรับยศใหม่เข้าไปในแผงเดิมที่มีอยู่แล้ว')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('Message ID ของแผงรับยศเดิม (คลิกขวาที่ข้อความแผงแล้วกด Copy Message ID)')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('ยศใหม่ที่ต้องการเพิ่มเข้าไปในแผง')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('button_label')
        .setDescription('ข้อความบนปุ่ม')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('button_style')
        .setDescription('สีของปุ่ม')
        .setRequired(false)
        .addChoices(
          { name: '🟢 สีเขียว (Success)', value: 'SUCCESS' },
          { name: '🔵 สีน้ำเงิน (Primary)', value: 'PRIMARY' },
          { name: '⚪ สีเทา (Secondary)', value: 'SECONDARY' },
          { name: '🔴 สีแดง (Danger)', value: 'DANGER' }
        )
    )
    .addStringOption(option =>
      option.setName('button_emoji')
        .setDescription('อีโมจิบนปุ่ม (เช่น 🎮, ⭐, 👑)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('โหมดการทำงาน')
        .setRequired(false)
        .addChoices(
          { name: 'สลับยศเข้า/ออก (Toggle)', value: 'TOGGLE' },
          { name: 'ยืนยันตัวตนครั้งเดียว (Verify)', value: 'VERIFY' }
        )
    ),

  async execute(interaction, { db }) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles) &&
        !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ **คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้**',
        ephemeral: true
      });
    }

    const messageId = interaction.options.getString('message_id').trim();
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('button_label');
    const styleChoice = interaction.options.getString('button_style') || 'PRIMARY';
    const emoji = interaction.options.getString('button_emoji') || '';
    const mode = interaction.options.getString('mode') || 'TOGGLE';

    const panel = db.getPanelByMessageId(messageId);
    if (!panel) {
      return interaction.reply({
        content: `❌ ไม่พบแผงรับยศที่มี Message ID: \`${messageId}\` ในฐานข้อมูลครับ กรุณาตรวจสอบ ID ให้ถูกต้อง`,
        ephemeral: true
      });
    }

    // Role Hierarchy Check
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: `⚠️ **ยศ @${role.name} อยู่สูงกว่าหรือเท่ากับยศของบอท** กรุณาลากยศบอทขึ้นไปสูงกว่าก่อนครับ`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = await interaction.guild.channels.fetch(panel.channel_id);
      const message = await channel.messages.fetch(panel.message_id);

      const customId = `btn_role_${role.id}_${Date.now()}`;
      const buttonStyle = STYLE_MAP[styleChoice] || ButtonStyle.Primary;

      const newButton = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(buttonStyle);

      if (emoji) {
        try { newButton.setEmoji(emoji); } catch {}
      }

      // Rebuild action rows
      const existingComponents = message.components.map(row => ActionRowBuilder.from(row));
      let added = false;

      for (const row of existingComponents) {
        if (row.components.length < 5) {
          row.addComponents(newButton);
          added = true;
          break;
        }
      }

      if (!added && existingComponents.length < 5) {
        const newRow = new ActionRowBuilder().addComponents(newButton);
        existingComponents.push(newRow);
      } else if (!added) {
        return interaction.editReply({
          content: '❌ ไม่สามารถเพิ่มปุ่มได้: ข้อความนี้มีจำนวนปุ่มครบขีดจำกัดสูงสุดของ Discord แล้ว (สูงสุด 25 ปุ่ม)'
        });
      }

      await message.edit({ components: existingComponents });

      db.saveButton(panel.id, customId, role.id, label, styleChoice, emoji, mode);

      await interaction.editReply({
        content: `✅ เพิ่มปุ่ม **${label}** (${role}) เข้าไปในแผงเรียบร้อยแล้วครับ!`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ ไม่สามารถแก้ไขข้อความแผงได้: \`${err.message}\``
      });
    }
  }
};
