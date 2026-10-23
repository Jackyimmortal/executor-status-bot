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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credit-panel')
    .setDescription('สร้างแผงปุ่มสำหรับให้ลูกค้ากดส่งรีวิว/ให้เครดิตร้านค้า')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('ห้องที่ต้องการส่งแผงไป (ค่าเริ่มต้นคือห้องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_open_credit_modal')
        .setLabel('⭐ กดส่งรีวิว / ให้เครดิตร้านค้า')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝')
    );

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📝 ส่งรีวิว & ให้เครดิตร้านค้า')
      .setDescription(
        'หากคุณได้รับสินค้าจากร้าน **XSTOREHUB** เรียบร้อยแล้ว\n' +
        'สามารถกดปุ่ม **"⭐ กดส่งรีวิว / ให้เครดิตร้านค้า"** ด้านล่างเพื่อส่งความประทับใจและให้คะแนนร้านได้เลยครับ!\n\n' +
        '💖 ทุกรีวิวของคุณคือกำลังใจของทีมงาน ขอบคุณมากครับ'
      )
      .setFooter({ text: 'XSTOREHUB • ระบบรีวิวเครดิตอัตโนมัติ' })
      .setTimestamp();

    await targetChannel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ สร้างแผงให้เครดิตในห้อง ${targetChannel} เรียบร้อยแล้วครับ!`,
      ephemeral: true
    });
  }
};
