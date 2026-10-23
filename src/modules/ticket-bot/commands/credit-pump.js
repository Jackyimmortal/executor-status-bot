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
    .setDescription('⚡ ปั้มเครดิตจำลองอัตโนมัติ (รองรับสูงสุด 1,000 รายการ)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('จำนวนเครดิตที่ต้องการปั้ม (1 - 1,000 รายการ)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1000)
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

    let stats;

    if (count <= 5) {
      // Send individual cards for small amounts
      for (let i = 0; i < count; i++) {
        const product = specifiedProduct || getRandomItem(SAMPLE_PRODUCTS);
        const comment = getRandomItem(SAMPLE_COMMENTS);
        const buyer = getRandomItem(SAMPLE_BUYERS);
        const price = getRandomItem(SAMPLE_PRICES);
        const txId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
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
          .setTimestamp();

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
          if (count > 1) {
            await new Promise(r => setTimeout(r, 600));
          }
        } catch {}
      }
      stats = db.getCreditStats(interaction.guildId);
    } else {
      // Bulk Mode (up to 1,000 items): Fast Database Batch Insert
      stats = db.bulkSaveCredits(interaction.guildId, targetChannel.id, count, specifiedProduct);

      // Post 3 sample showcase cards to the channel so users see active recent reviews
      for (let i = 0; i < 3; i++) {
        const product = specifiedProduct || getRandomItem(SAMPLE_PRODUCTS);
        const comment = getRandomItem(SAMPLE_COMMENTS);
        const buyer = getRandomItem(SAMPLE_BUYERS);
        const price = getRandomItem(SAMPLE_PRICES);
        const txId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;

        const sampleEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`🛒 บันทึกเครดิตการซื้อขาย • ${txId}`)
          .setDescription(`ขอบคุณลูกค้าที่ไว้วางใจเลือกซื้อสินค้ากับร้าน **${interaction.guild.name}** ครับ! ❤️`)
          .addFields(
            { name: '👤 ลูกค้า', value: `\`${buyer}\``, inline: true },
            { name: '📦 สินค้าที่ซื้อ', value: `\`${product}\``, inline: true },
            { name: '💵 ยอดเงิน', value: `\`${price}\``, inline: true },
            { name: '⭐ ความพึงพอใจ', value: '⭐⭐⭐⭐⭐ (5/5)', inline: true },
            { name: '💬 รีวิวจากผู้ซื้อ', value: `> *"${comment}"*`, inline: false }
          )
          .setFooter({ text: `${interaction.guild.name} • ประวัติการซื้อขายจริง` })
          .setTimestamp();

        await targetChannel.send({ embeds: [sampleEmbed] }).catch(() => {});
        await new Promise(r => setTimeout(r, 500));
      }

      // Send Grand Milestone announcement embed
      const milestoneEmbed = new EmbedBuilder()
        .setColor(0xF1C40F) // Gold
        .setTitle(`🏆 บันทึกเครดิตการซื้อขายสะสม • +${count.toLocaleString()} รายการ`)
        .setDescription(
          `🎉 **ร้านค้า ${interaction.guild.name} อัปเดตยอดประวัติการสั่งซื้อสำเร็จ!**\n\n` +
          `• 📦 บันทึกรายการซื้อขายใหม่: **+${count.toLocaleString()}** ออเดอร์\n` +
          `• 📊 **ยอดเครดิตสะสมรวมของร้านตอนนี้: \`${stats.total.toLocaleString()}\` รายการ**\n` +
          `• ⭐ คะแนนความพึงพอใจ: \`${stats.avgRating} / 5.0\` ดาว\n` +
          `• 🛡️ ความปลอดภัย: \`✅ Verified Seller • ได้รับของจริง 100%\``
        )
        .setFooter({ text: `${interaction.guild.name} • ร้านค้าคุณภาพ มีเครดิตแน่น มั่นใจได้` })
        .setTimestamp();

      await targetChannel.send({ embeds: [milestoneEmbed] }).catch(() => {});
    }

    await interaction.editReply({
      content: `🎉 **ปั้มเครดิตจำนวน ${count.toLocaleString()} รายการสำเร็จเรียบร้อย!**\n` +
        `• ส่งไปยังห้อง ${targetChannel}\n` +
        `• 🔥 **ยอดรวมเครดิตทั้งหมดของร้านตอนนี้: \`${stats.total.toLocaleString()}\` รายการ**\n` +
        `*(สามารถพิมพ์ \`/credit-stats\` เพื่อตรวจสอบสถิติได้ตลอดเวลาครับ)*`
    });
  }
};
