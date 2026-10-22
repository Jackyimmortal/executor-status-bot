'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { parseColor } = require('../utils/colors');

const STYLE_MAP = {
  SUCCESS: ButtonStyle.Success,   // Green
  PRIMARY: ButtonStyle.Primary,   // Blurple / Blue
  SECONDARY: ButtonStyle.Secondary, // Grey
  DANGER: ButtonStyle.Danger      // Red
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('สร้างแผงรับยศ / ปุ่มยืนยันตัวตนในห้องแชท (รองรับการใส่รูปภาพ)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addStringOption(option =>
      option.setName('title')
        .setDescription('หัวข้อของแผงรับยศ (เช่น ยืนยันตัวตน, รับยศสมาชิก)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('รายละเอียดของแผง (เช่น กดปุ่มด้านล่างเพื่อรับยศเข้าสู่เซิร์ฟเวอร์)')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('ยศที่ต้องการแจกเมื่อกดปุ่ม')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('image_file')
        .setDescription('🖼️ แนบไฟล์รูปภาพแบนเนอร์ด้านล่างแผง (PNG, JPG, GIF)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image_url')
        .setDescription('🔗 ลิงก์ URL รูปภาพแบนเนอร์ด้านล่าง (กรณีมีลิงก์รูปภาพเว็บ)')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('thumbnail_file')
        .setDescription('📌 แนบไฟล์รูปภาพโลโก้เล็กมุมขวาบน')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('thumbnail_url')
        .setDescription('🌐 ลิงก์ URL รูปภาพโลโก้เล็กมุมขวาบน')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('🎨 สีขอบแผง เช่น #5865F2, ฟ้า, เขียว, แดง, ทอง, ม่วง, ชมพู, ดำ')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button_label')
        .setDescription('ข้อความบนปุ่ม (เช่น ยืนยันตัวตน, รับยศ)')
        .setRequired(false)
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
        .setDescription('อีโมจิบนปุ่ม (เช่น ✅, 👑, 🎮)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('โหมดการทำงานของปุ่ม')
        .setRequired(false)
        .addChoices(
          { name: 'สลับยศเข้า/ออก (Toggle - กดรับ/กดซ้ำเอายศออก)', value: 'TOGGLE' },
          { name: 'ยืนยันตัวตนครั้งเดียว (Verify - กดรับแล้วไม่เอายศออก)', value: 'VERIFY' }
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('ห้องที่ต้องการส่งแผงไป (ค่าเริ่มต้นคือห้องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction, { db }) {
    // 1. Permission check
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles) &&
        !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ **คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้**: ต้องมีสิทธิ์ `Manage Roles (จัดการบทบาท)` หรือ `Administrator` ครับ',
        ephemeral: true
      });
    }

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('button_label') || `รับยศ ${role.name}`;
    const styleChoice = interaction.options.getString('button_style') || 'SUCCESS';
    const emoji = interaction.options.getString('button_emoji') || '✅';
    const mode = interaction.options.getString('mode') || 'TOGGLE';
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    // Image & Color Options
    const imageAttachment = interaction.options.getAttachment('image_file');
    const imageUrlOption = interaction.options.getString('image_url');
    const bannerUrl = imageAttachment ? imageAttachment.url : (imageUrlOption ? imageUrlOption.trim() : null);

    const thumbAttachment = interaction.options.getAttachment('thumbnail_file');
    const thumbUrlOption = interaction.options.getString('thumbnail_url');
    const thumbnailUrl = thumbAttachment ? thumbAttachment.url : (thumbUrlOption ? thumbUrlOption.trim() : null);

    const colorInput = interaction.options.getString('color');
    const resolvedColor = parseColor(colorInput, 0x57F287);

    // 2. Role Hierarchy Check
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: `⚠️ **ข้อผิดพลาดลำดับชั้นของยศ (Role Hierarchy)**:\n` +
          `ยศ **@${role.name}** อยู่สูงกว่าหรือเท่ากับยศของบอท (${botMember.roles.highest.name})\n` +
          `👉 **วิธีแก้:** ไปที่ **การตั้งค่าเซิร์ฟเวอร์ (Server Settings) ➔ บทบาท (Roles)** แล้วลากยศของบอท **XSTOREHUB-ROLE** ให้ไปอยู่ **สูงกว่า** ยศ **@${role.name}** ครับ!`,
        ephemeral: true
      });
    }

    if (role.managed) {
      return interaction.reply({
        content: '❌ ไม่สามารถแจกยศนี้ได้เนื่องจากเป็นยศที่ผูกกับบอทตัวอื่นหรือระบบอัตโนมัติ (Managed Role)',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // 3. Create Embed & Button
    const customId = `btn_role_${role.id}_${Date.now()}`;
    const buttonStyle = STYLE_MAP[styleChoice] || ButtonStyle.Success;

    const button = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(buttonStyle);

    if (emoji) {
      try {
        button.setEmoji(emoji);
      } catch {
        // Ignore invalid emoji string
      }
    }

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setColor(resolvedColor)
      .setTitle(`✨ ${title}`)
      .setDescription(`${description}\n\n👉 **ยศที่จะได้รับ:** ${role}`)
      .setFooter({ text: 'XSTOREHUB • ระบบรับยศอัตโนมัติ' })
      .setTimestamp();

    if (bannerUrl) {
      embed.setImage(bannerUrl);
    }

    if (thumbnailUrl) {
      embed.setThumbnail(thumbnailUrl);
    }

    try {
      const panelMessage = await targetChannel.send({
        embeds: [embed],
        components: [row]
      });

      // 4. Save to Database
      const hexColorStr = '#' + resolvedColor.toString(16).padStart(6, '0');
      const panelId = db.savePanel(
        interaction.guildId,
        targetChannel.id,
        panelMessage.id,
        title,
        description,
        hexColorStr,
        bannerUrl,
        thumbnailUrl
      );

      db.saveButton(panelId, customId, role.id, label, styleChoice, emoji, mode);

      await interaction.editReply({
        content: `✅ **สร้างแผงรับยศสำเร็จแล้ว!** ส่งไปยังห้อง ${targetChannel} เรียบร้อยแล้วครับ (Message ID: \`${panelMessage.id}\`)${bannerUrl ? '\n🖼️ แนบรูปภาพแบนเนอร์เรียบร้อย' : ''}${thumbnailUrl ? '\n📌 แนบรูปโลโก้เรียบร้อย' : ''}`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาดในการส่งข้อความ: \`${err.message}\``
      });
    }
  }
};
