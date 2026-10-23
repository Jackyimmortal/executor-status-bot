'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credit-create')
    .setDescription('สร้างโพสต์เครดิต/รีวิวการซื้อขายลงห้องรีวิว')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addStringOption(option =>
      option.setName('product')
        .setDescription('ชื่อสินค้าที่ลูกค้าสั่งซื้อ (เช่น Delta Key VIP, Robux 1000)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('comment')
        .setDescription('ข้อความรีวิวจากลูกค้า (เช่น ได้ของจริง ไวมากครับ +1 เครดิต)')
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName('customer')
        .setDescription('แท็กดิสคอร์ดของลูกค้า (ถ้ามี)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('customer_name')
        .setDescription('หรือพิมพ์ชื่อลูกค้า (กรณีไม่มีแท็ก เช่น น้องบาส_Roblox)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('price')
        .setDescription('ราคาของสินค้า (เช่น 50 บาท, 100฿)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('rating')
        .setDescription('คะแนนความพึงพอใจ')
        .setRequired(false)
        .addChoices(
          { name: '⭐⭐⭐⭐⭐ 5 ดาว (ยอดเยี่ยม)', value: 5 },
          { name: '⭐⭐⭐⭐ 4 ดาว (ดีมาก)', value: 4 },
          { name: '⭐⭐⭐ 3 ดาว (ปานกลาง)', value: 3 }
        )
    )
    .addAttachmentOption(option =>
      option.setName('slip_image')
        .setDescription('🖼️ แนบรูปภาพสลิปโอนเงิน / หลักฐานส่งของ')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('ห้องที่ต้องการส่งเครดิตไป (เช่น #review)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction, { db }) {
    const product = interaction.options.getString('product');
    const comment = interaction.options.getString('comment');
    const customerUser = interaction.options.getUser('customer');
    const customerNameInput = interaction.options.getString('customer_name');
    const price = interaction.options.getString('price') || 'ไม่ระบุ';
    const rating = interaction.options.getInteger('rating') || 5;
    const slip = interaction.options.getAttachment('slip_image');

    let targetChannel = interaction.options.getChannel('channel');
    if (!targetChannel) {
      // Find #review or #credit channel automatically
      targetChannel = interaction.guild.channels.cache.find(
        c => c.name.toLowerCase().includes('review') || c.name.toLowerCase().includes('credit')
      ) || interaction.channel;
    }

    const customerDisplay = customerUser ? `<@${customerUser.id}>` : (customerNameInput || 'ลูกค้าทั่วไป');
    const customerText = customerUser ? customerUser.tag : (customerNameInput || 'ลูกค้าทั่วไป');
    const stars = '⭐'.repeat(rating);
    const txId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;

    const embed = new EmbedBuilder()
      .setColor(0x57F287) // Bright Green
      .setTitle(`🛒 บันทึกเครดิตการซื้อขาย • ${txId}`)
      .setDescription(`ขอบคุณลูกค้าที่ไว้วางใจเลือกซื้อสินค้ากับร้าน **${interaction.guild.name}** ครับ! ❤️`)
      .addFields(
        { name: '👤 ลูกค้า', value: customerDisplay, inline: true },
        { name: '📦 สินค้าที่ซื้อ', value: `\`${product}\``, inline: true },
        { name: '💵 ยอดเงิน', value: `\`${price}\``, inline: true },
        { name: '⭐ ความพึงพอใจ', value: `${stars} (${rating}/5)`, inline: true },
        { name: '💬 ความคิดเห็น / รีวิว', value: `> *"${comment}"*`, inline: false },
        { name: '🛡️ สถานะการทำรายการ', value: '`✅ สำเร็จ • ได้รับสินค้าเรียบร้อย 100%`', inline: false }
      )
      .setFooter({ text: `${interaction.guild.name} • ร้านค้าปลอดภัย มั่นใจได้ 100%` })
      .setTimestamp();

    if (slip) {
      embed.setImage(slip.url);
    }

    try {
      const msg = await targetChannel.send({ embeds: [embed] });

      // Save to database
      db.saveCredit({
        guildId: interaction.guildId,
        channelId: targetChannel.id,
        messageId: msg.id,
        customerName: customerText,
        productName: product,
        price: price,
        rating: rating,
        comment: comment,
        imageUrl: slip ? slip.url : null,
        isAutomated: false
      });

      const stats = db.getCreditStats(interaction.guildId);

      await interaction.reply({
        content: `✅ **ส่งเครดิตเรียบร้อยแล้ว!** 👉 ส่งไปยังห้อง ${targetChannel} (ยอดรวมเครดิตร้านตอนนี้: **${stats.total}** เครดิต)`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ เกิดข้อผิดพลาดในการส่งเครดิต: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};
