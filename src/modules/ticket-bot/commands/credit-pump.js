'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const {
  SAMPLE_PRODUCTS,
  SAMPLE_COMMENTS,
  SAMPLE_PRICES,
  SAMPLE_BUYERS,
  getRandomItem
} = require('../utils/credit-presets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credit-pump')
    .setDescription('⚡ ปั้มเครดิตจำลองอัตโนมัติ (สุ่มชื่อลูกค้า ข้อความรีวิว และสินค้า)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('จำนวนเครดิตที่ต้องการสร้าง (1 - 10 รายการ)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('ห้องที่ต้องการส่งเครดิตไป (เช่น #review)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('product')
        .setDescription('ระบุชื่อสินค้าเจาะจง (ถ้าไม่ระบุจะสุ่มสินค้าให้)')
        .setRequired(false)
    ),

  async execute(interaction, { db }) {
    const count = interaction.options.getInteger('count') || 1;
    const specifiedProduct = interaction.options.getString('product');

    let targetChannel = interaction.options.getChannel('channel');
    if (!targetChannel) {
      targetChannel = interaction.guild.channels.cache.find(
        c => c.name.toLowerCase().includes('review') || c.name.toLowerCase().includes('credit')
      ) || interaction.channel;
    }

    await interaction.deferReply({ ephemeral: true });

    let successCount = 0;

    for (let i = 0; i < count; i++) {
      const product = specifiedProduct || getRandomItem(SAMPLE_PRODUCTS);
      const comment = getRandomItem(SAMPLE_COMMENTS);
      const buyer = getRandomItem(SAMPLE_BUYERS);
      const price = getRandomItem(SAMPLE_PRICES);
      const txId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Blurple / Gold / Green
        .setTitle(`🛒 บันทึกเครดิตการซื้อขาย • ${txId}`)
        .setDescription(`ขอบคุณลูกค้าที่ไว้วางใจเลือกซื้อสินค้ากับร้าน **${interaction.guild.name}** ครับ! ❤️`)
        .addFields(
          { name: '👤 ลูกค้า', value: `\`${buyer}\``, inline: true },
          { name: '📦 สินค้าที่ซื้อ', value: `\`${product}\``, inline: true },
          { name: '💵 ยอดเงิน', value: `\`${price}\``, inline: true },
          { name: '⭐ ความพึงพอใจ', value: '⭐⭐⭐⭐⭐ (5/5)', inline: true },
          { name: '💬 รีวิวจากผู้ซื้อ', value: `> *"${comment}"*`, inline: false },
          { name: '🛡️ สถานะการทำรายการ', value: '`✅ สำเร็จ • ได้รับสินค้าเรียบร้อย 100%`', inline: false }
        )
        .setFooter({ text: `${interaction.guild.name} • ร้านค้าปลอดภัย มั่นใจได้ 100%` })
        .setTimestamp(new Date(Date.now() - Math.floor(Math.random() * 10 * 60 * 1000))); // Random recent timestamp

      try {
        const msg = await targetChannel.send({ embeds: [embed] });

        db.saveCredit({
          guildId: interaction.guildId,
          channelId: targetChannel.id,
          messageId: msg.id,
          customerName: buyer,
          productName: product,
          price: price,
          rating: 5,
          comment: comment,
          imageUrl: null,
          isAutomated: true
        });

        successCount++;

        // Small delay between multiple sends to avoid Discord rate limit
        if (count > 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (err) {
        // If error, break out
        break;
      }
    }

    const stats = db.getCreditStats(interaction.guildId);

    await interaction.editReply({
      content: `🎉 **ปั้มเครดิตสำเร็จเรียบร้อย!**\n` +
        `• สร้างและส่งเครดิตไปที่ห้อง ${targetChannel} ทั้งหมด **${successCount}** รายการ\n` +
        `• ยอดรวมเครดิตทั้งหมดของร้าน: **${stats.total}** เครดิต (คะแนนเฉลี่ย ${stats.avgRating} ⭐)`
    });
  }
};
