'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { parseColor } = require('../utils/colors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-edit')
    .setDescription('แก้ไขรูปภาพ ข้อความ หรือสีของแผงรับยศเดิม')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('Message ID ของแผงรับยศเดิม (คลิกขวาที่ข้อความแผงแล้วกด Copy Message ID)')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('image_file')
        .setDescription('🖼️ แนบไฟล์รูปภาพแบนเนอร์ใหม่')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image_url')
        .setDescription('🔗 ลิงก์ URL รูปภาพแบนเนอร์ใหม่')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('thumbnail_file')
        .setDescription('📌 แนบไฟล์รูปโลโก้เล็กใหม่')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('thumbnail_url')
        .setDescription('🌐 ลิงก์ URL รูปโลโก้เล็กใหม่')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('หัวข้อใหม่ของแผง')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('รายละเอียดข้อความใหม่ของแผง')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('🎨 สีขอบใหม่ เช่น #5865F2, ฟ้า, เขียว, แดง, ทอง, ม่วง, ชมพู, ดำ')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('remove_image')
        .setDescription('ต้องการลบรูปภาพแบนเนอร์ออกหรือไม่ (True = ลบออก)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('remove_thumbnail')
        .setDescription('ต้องการลบรูปโลโก้เล็กออกหรือไม่ (True = ลบออก)')
        .setRequired(false)
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
    const panel = db.getPanelByMessageId(messageId);

    if (!panel) {
      return interaction.reply({
        content: `❌ ไม่พบแผงรับยศที่มี Message ID: \`${messageId}\` ในฐานข้อมูลครับ`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = await interaction.guild.channels.fetch(panel.channel_id);
      const message = await channel.messages.fetch(panel.message_id);

      if (!message.embeds.length) {
        return interaction.editReply({
          content: '❌ ข้อความแผงนี้ไม่มี Embed อยู่'
        });
      }

      const existingEmbed = message.embeds[0];
      const newEmbed = EmbedBuilder.from(existingEmbed);

      const titleInput = interaction.options.getString('title');
      const descInput = interaction.options.getString('description');
      const colorInput = interaction.options.getString('color');
      const removeImage = interaction.options.getBoolean('remove_image');
      const removeThumbnail = interaction.options.getBoolean('remove_thumbnail');

      const imageFile = interaction.options.getAttachment('image_file');
      const imageUrlOption = interaction.options.getString('image_url');
      const newBannerUrl = imageFile ? imageFile.url : (imageUrlOption ? imageUrlOption.trim() : null);

      const thumbFile = interaction.options.getAttachment('thumbnail_file');
      const thumbUrlOption = interaction.options.getString('thumbnail_url');
      const newThumbUrl = thumbFile ? thumbFile.url : (thumbUrlOption ? thumbUrlOption.trim() : null);

      let updatedTitle = panel.title;
      let updatedDesc = panel.description;
      let updatedColor = panel.color;
      let updatedImageUrl = panel.image_url;
      let updatedThumbUrl = panel.thumbnail_url;

      if (titleInput) {
        newEmbed.setTitle(`✨ ${titleInput}`);
        updatedTitle = titleInput;
      }

      if (descInput) {
        newEmbed.setDescription(descInput);
        updatedDesc = descInput;
      }

      if (colorInput) {
        const parsedCol = parseColor(colorInput);
        newEmbed.setColor(parsedCol);
        updatedColor = '#' + parsedCol.toString(16).padStart(6, '0');
      }

      if (removeImage) {
        newEmbed.setImage(null);
        updatedImageUrl = null;
      } else if (newBannerUrl) {
        newEmbed.setImage(newBannerUrl);
        updatedImageUrl = newBannerUrl;
      }

      if (removeThumbnail) {
        newEmbed.setThumbnail(null);
        updatedThumbUrl = null;
      } else if (newThumbUrl) {
        newEmbed.setThumbnail(newThumbUrl);
        updatedThumbUrl = newThumbUrl;
      }

      newEmbed.setTimestamp();

      await message.edit({ embeds: [newEmbed] });

      db.updatePanel(panel.id, {
        title: updatedTitle,
        description: updatedDesc,
        color: updatedColor,
        imageUrl: updatedImageUrl,
        thumbnailUrl: updatedThumbUrl
      });

      await interaction.editReply({
        content: `✅ **แก้ไขแผงรับยศสำเร็จแล้ว!** (Message ID: \`${messageId}\`)${newBannerUrl ? '\n🖼️ อัปเดตรูปแบนเนอร์เรียบร้อย' : ''}${newThumbUrl ? '\n📌 อัปเดตรูปโลโก้เรียบร้อย' : ''}`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาดในการแก้ไขแผง: \`${err.message}\``
      });
    }
  }
};
