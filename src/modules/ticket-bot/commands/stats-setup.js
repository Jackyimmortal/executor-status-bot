'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-setup')
    .setDescription('สร้างป้ายสถิตินับจำนวนสมาชิกและเครดิตร้านค้าแบบเรียลไทม์')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction, { db }) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const botMember = guild.members.me;

    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.editReply({
        content: '❌ บอทไม่มีสิทธิ์ `Manage Channels (จัดการแชนแนล)` กรุณาให้สิทธิ์บอทก่อนครับ'
      });
    }

    try {
      // 1. Create Category
      const category = await guild.channels.create({
        name: '📊 สถิติเซิร์ฟเวอร์',
        type: ChannelType.GuildCategory,
        position: 0,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.Connect],
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      // 2. Calculate Stats
      const totalMembers = guild.memberCount;
      const creditStats = db.getCreditStats(guild.id);

      // 3. Create Stat Channels
      const memberChan = await guild.channels.create({
        name: `👥 สมาชิก: ${totalMembers.toLocaleString()} คน`,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.Connect],
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      const creditChan = await guild.channels.create({
        name: `🛒 เครดิตร้าน: ${creditStats.total} รายการ`,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.Connect],
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ ติดตั้งป้ายสถิติเซิร์ฟเวอร์สำเร็จ!')
        .setDescription(
          `สร้างหมวดหมู่ **📊 สถิติเซิร์ฟเวอร์** ไว้ด้านบนสุดเรียบร้อยแล้วครับ!\n\n` +
          `• 👥 สมาชิกทั้งหมด: **${totalMembers.toLocaleString()}** คน\n` +
          `• 🛒 เครดิตร้าน: **${creditStats.total}** รายการ\n\n` +
          `*(ป้ายนี้ล็อกไม่ให้คนเข้าพูด เป็นป้ายแสดงตัวเลขเรียลไทม์เพื่อเพิ่มความน่าเชื่อถือให้ร้านครับ)*`
        )
        .setFooter({ text: 'XSTOREHUB • ระบบสถิติอัตโนมัติ' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาดในการสร้างป้ายสถิติ: \`${err.message}\``
      });
    }
  }
};
