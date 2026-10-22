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
  PRIMARY: ButtonStyle.Primary,
  SUCCESS: ButtonStyle.Success,
  SECONDARY: ButtonStyle.Secondary,
  DANGER: ButtonStyle.Danger
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('สร้างแผงเปิดทิกเก็ต / ติดต่อทีมงาน (รองรับใส่รูปภาพและปรับแต่งสี)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addStringOption(option =>
      option.setName('title')
        .setDescription('หัวข้อของแผง (เช่น 📩 ติดต่อทีมงาน / สั่งซื้อสินค้า)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('รายละเอียดของแผง (เช่น กดปุ่มด้านล่างเพื่อเปิดห้องส่วนตัวพูดคุยกับทีมงาน)')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('support_role')
        .setDescription('ยศทีมงานที่จะมีสิทธิ์มองเห็นและตอบห้องทิกเก็ต')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('category')
        .setDescription('หมวดหมู่ (Category) ที่จะใช้สร้างห้องทิกเก็ต')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button_label')
        .setDescription('ข้อความบนปุ่มเปิดทิกเก็ต (ค่าเริ่มต้น: เปิดทิกเก็ต)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button_emoji')
        .setDescription('อีโมจิบนปุ่ม (เช่น 📩, 🎫, 💬, 🛒)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button_style')
        .setDescription('สีของปุ่ม')
        .setRequired(false)
        .addChoices(
          { name: '🔵 สีน้ำเงิน (Primary)', value: 'PRIMARY' },
          { name: '🟢 สีเขียว (Success)', value: 'SUCCESS' },
          { name: '⚪ สีเทา (Secondary)', value: 'SECONDARY' },
          { name: '🔴 สีแดง (Danger)', value: 'DANGER' }
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('ห้องที่ต้องการส่งแผงไป (ค่าเริ่มต้นคือห้องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('image_file')
        .setDescription('🖼️ แนบไฟล์รูปภาพแบนเนอร์ด้านล่าง (PNG, JPG, GIF)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image_url')
        .setDescription('🔗 ลิงก์ URL รูปภาพแบนเนอร์ด้านล่าง')
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
    ),

  async execute(interaction, { db }) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ **คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้**: ต้องมีสิทธิ์ `Manage Channels (จัดการช่อง)` หรือ `Administrator` ครับ',
        ephemeral: true
      });
    }

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const supportRole = interaction.options.getRole('support_role');
    const category = interaction.options.getChannel('category');
    const label = interaction.options.getString('button_label') || 'เปิดทิกเก็ต';
    const emoji = interaction.options.getString('button_emoji') || '📩';
    const styleChoice = interaction.options.getString('button_style') || 'PRIMARY';
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const imageAttachment = interaction.options.getAttachment('image_file');
    const imageUrlOption = interaction.options.getString('image_url');
    const bannerUrl = imageAttachment ? imageAttachment.url : (imageUrlOption ? imageUrlOption.trim() : null);

    const thumbAttachment = interaction.options.getAttachment('thumbnail_file');
    const thumbUrlOption = interaction.options.getString('thumbnail_url');
    const thumbnailUrl = thumbAttachment ? thumbAttachment.url : (thumbUrlOption ? thumbUrlOption.trim() : null);

    const colorInput = interaction.options.getString('color');
    const resolvedColor = parseColor(colorInput, 0x5865F2);

    await interaction.deferReply({ ephemeral: true });

    // Check bot permissions in target channel
    const botMember = interaction.guild.members.me;
    const channelPerms = targetChannel.permissionsFor(botMember);

    if (!channelPerms ||
        !channelPerms.has(PermissionsBitField.Flags.ViewChannel) ||
        !channelPerms.has(PermissionsBitField.Flags.SendMessages) ||
        !channelPerms.has(PermissionsBitField.Flags.EmbedLinks)) {
      return interaction.editReply({
        content: `⚠️ **บอทขาดสิทธิ์ในห้อง ${targetChannel}**:\n` +
          `บอทต้องมีสิทธิ์ **ดูแชนแนล (View Channel)**, **ส่งข้อความ (Send Messages)**, และ **ฝังลิงก์ (Embed Links)** ในห้องนี้ครับ\n\n` +
          `👉 **วิธีแก้ง่ายๆ (เลือก 1 วิธี):**\n` +
          `• **วิธีที่ 1 (แนะนำ):** ไปที่ **การตั้งค่าเซิร์ฟเวอร์ ➔ บทบาท (Roles)** แล้วมอบยศ **BOT-XSTOREHUB** หรือยศ **ผู้ดูแลระบบ (Admin)** ให้กับบอท **XSTORE-TICKET**\n` +
          `• **วิธีที่ 2:** กดฟันเฟือง ⚙️ แก้ไขห้อง ${targetChannel} ➔ **การอนุญาต (Permissions)** ➔ เพิ่มบอท **XSTORE-TICKET** แล้วติ๊กถูกเขียวที่ **ดูแชนแนล**, **ส่งข้อความ**, และ **ฝังลิงก์** ครับ`
      });
    }

    const customId = `btn_ticket_open_${Date.now()}`;
    const buttonStyle = STYLE_MAP[styleChoice] || ButtonStyle.Primary;

    const button = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(buttonStyle);

    if (emoji) {
      try { button.setEmoji(emoji); } catch {}
    }

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setColor(resolvedColor)
      .setTitle(`🎫 ${title}`)
      .setDescription(`${description}\n\n👉 **ทีมงานผู้ดูแล:** ${supportRole}\nกดปุ่ม **"${label}"** ด้านล่างเพื่อสร้างห้องสนทนาส่วนตัว`)
      .setFooter({ text: 'ระบบเปิดห้องติดต่อทีมงานอัตโนมัติ' })
      .setTimestamp();

    if (bannerUrl) embed.setImage(bannerUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

    try {
      const panelMessage = await targetChannel.send({
        embeds: [embed],
        components: [row]
      });

      const hexColor = '#' + resolvedColor.toString(16).padStart(6, '0');
      db.savePanel({
        guildId: interaction.guildId,
        channelId: targetChannel.id,
        messageId: panelMessage.id,
        customId: customId,
        title: title,
        description: description,
        categoryId: category ? category.id : null,
        supportRoleId: supportRole.id,
        buttonLabel: label,
        buttonStyle: styleChoice,
        buttonEmoji: emoji,
        color: hexColor,
        imageUrl: bannerUrl,
        thumbnailUrl: thumbnailUrl
      });

      await interaction.editReply({
        content: `✅ **สร้างแผงทิกเก็ตสำเร็จแล้ว!** ส่งไปยังห้อง ${targetChannel} เรียบร้อยแล้วครับ (Message ID: \`${panelMessage.id}\`)${bannerUrl ? '\n🖼️ แนบรูปภาพแบนเนอร์เรียบร้อย' : ''}`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาดในการสร้างแผง: \`${err.message}\``
      });
    }
  }
};
