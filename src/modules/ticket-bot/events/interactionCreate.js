'use strict';

const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, { client, db, commands }) {
    // 1. Slash Command Handling
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, { client, db });
      } catch (err) {
        logger.error(`Error in command /${interaction.commandName}:`, err);
        const reply = {
          content: `❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง: \`${err.message}\``,
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

    // 2. Button Handling
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // A. Open Ticket Button
      if (customId.startsWith('btn_ticket_open')) {
        await handleOpenTicket(interaction, { db, client });
        return;
      }

      // B. Close Request Button
      if (customId === 'btn_ticket_close_req') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_ticket_confirm_close')
            .setLabel('ยืนยันปิดทิกเก็ต')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
          new ButtonBuilder()
            .setCustomId('btn_ticket_cancel_close')
            .setLabel('ยกเลิก')
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🔒 ยืนยันการปิดทิกเก็ต')
          .setDescription('คุณต้องการปิดห้องทิกเก็ตนี้ใช่หรือไม่? หลังจากปิดแล้วจะถูกล็อกการพิมพ์');

        await interaction.reply({
          embeds: [embed],
          components: [row]
        });
        return;
      }

      // C. Confirm Close
      if (customId === 'btn_ticket_confirm_close') {
        await handleConfirmClose(interaction, { db });
        return;
      }

      // D. Cancel Close
      if (customId === 'btn_ticket_cancel_close') {
        await interaction.message.delete().catch(() => {});
        return;
      }

      // E. Reopen Ticket
      if (customId === 'btn_ticket_reopen') {
        await handleReopenTicket(interaction, { db });
        return;
      }

      // F. Delete Ticket Channel
      if (customId === 'btn_ticket_delete') {
        await handleDeleteTicket(interaction, { db });
        return;
      }

      // G. Transcript
      if (customId === 'btn_ticket_transcript') {
        await handleTranscript(interaction);
        return;
      }
    }
  }
};

async function handleOpenTicket(interaction, { db, client }) {
  const panel = db.getPanelByCustomId(interaction.customId);
  if (!panel) {
    return interaction.reply({
      content: '❌ ไม่พบข้อมูลแผงทิกเก็ตนี้ในระบบ',
      ephemeral: true
    });
  }

  // Prevent multiple open tickets per user
  const existing = db.getUserOpenTicket(interaction.guildId, interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `⚠️ **คุณมีห้องทิกเก็ตที่เปิดอยู่แล้วครับ**: <#${existing.channel_id}>`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const botMember = guild.members.me;

  // Bot permission check
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
      !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.editReply({
      content: '❌ **บอทขาดสิทธิ์จำเป็นในการสร้างห้องทิกเก็ต**:\n' +
        'บอทต้องมีสิทธิ์ **จัดการแชนแนล (Manage Channels)** และ **จัดการบทบาท (Manage Roles)** เพื่อสร้างห้องและตั้งค่าห้องส่วนตัวครับ\n\n' +
        '👉 **วิธีแก้ที่ง่ายที่สุด:** ไปที่ **การตั้งค่าเซิร์ฟเวอร์ ➔ บทบาท (Roles)** แล้วเปิดสิทธิ์ **ผู้ดูแลระบบ (Administrator)** ให้กับบอท `XSTORE-TICKET` ครับ'
    });
  }

  const ticketNumber = db.getNextTicketNumber(guild.id);
  const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;

  try {
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: botMember.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ];

    if (panel.support_role_id) {
      permissionOverwrites.push({
        id: panel.support_role_id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: panel.category_id || null,
      permissionOverwrites: permissionOverwrites,
      reason: `Ticket opened by ${interaction.user.tag}`
    });

    const ticketRecord = db.createTicket(
      guild.id,
      channel.id,
      interaction.user.id,
      panel.id,
      panel.support_role_id
    );

    const welcomeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_ticket_close_req')
        .setLabel('ปิดทิกเก็ต')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('btn_ticket_transcript')
        .setLabel('บันทึกประวัติการคุย')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜')
    );

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎫 ห้องทิกเก็ต #${String(ticketRecord.ticketNumber).padStart(4, '0')}`)
      .setDescription(
        `สวัสดีครับคุณ <@${interaction.user.id}>!\n\n` +
        `กรุณาพิมพ์แจ้งปัญหาหรือเรื่องที่ต้องการติดต่อได้เลยครับ ทีมงาน <@&${panel.support_role_id}> จะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ`
      )
      .addFields(
        { name: '👤 ผู้เปิดทิกเก็ต', value: `<@${interaction.user.id}>`, inline: true },
        { name: '🛡️ ทีมงานผู้ดูแล', value: `<@&${panel.support_role_id}>`, inline: true }
      )
      .setFooter({ text: 'กดปุ่ม "ปิดทิกเก็ต" ด้านล่างเมื่อพูดคุยเสร็จสิ้น' })
      .setTimestamp();

    await channel.send({
      content: `<@${interaction.user.id}> <@&${panel.support_role_id}>`,
      embeds: [welcomeEmbed],
      components: [welcomeRow]
    });

    await interaction.editReply({
      content: `✅ **เปิดห้องทิกเก็ตของคุณเรียบร้อยแล้ว!** 👉 ไปที่ห้อง <#${channel.id}> ได้เลยครับ`
    });
  } catch (err) {
    logger.error('Failed to create ticket channel:', err);
    let errorMsg = `❌ เกิดข้อผิดพลาดในการสร้างห้องทิกเก็ต: \`${err.message}\``;
    if (err.code === 50013) {
      errorMsg = '❌ **บอทขาดสิทธิ์ (Missing Permissions)** ในการสร้างห้องหรือตั้งค่าห้องส่วนตัวครับ\n\n' +
        '👉 **วิธีแก้ที่จบทุกปัญหา:**\n' +
        '1. ไปที่ **การตั้งค่าเซิร์ฟเวอร์ (Server Settings) ➔ บทบาท (Roles)**\n' +
        '2. เลือกยศของบอท **`XSTORE-TICKET`** (หรือยศ `BOT-XSTOREHUB`)\n' +
        '3. ไปที่แท็บ **การอนุญาต (Permissions)** ➔ เลื่อนลงไปล่างสุดเปิดสวิตช์ **ผู้ดูแลระบบ (Administrator)**\n' +
        '4. ลากยศบอทขึ้นไปไว้ด้านบน แล้วกดบันทึกครับ!';
    }
    await interaction.editReply({
      content: errorMsg
    });
  }
}

async function handleConfirmClose(interaction, { db }) {
  const channel = interaction.channel;
  const ticket = db.getTicketByChannelId(channel.id);

  if (!ticket) {
    return interaction.reply({
      content: '❌ ไม่พบข้อมูลทิกเก็ตของห้องนี้',
      ephemeral: true
    });
  }

  await interaction.deferUpdate();

  db.closeTicket(channel.id, interaction.user.tag);

  // Lock user permissions so they cannot send new messages
  try {
    await channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: false
    });
  } catch {}

  // 1. Generate Transcript
  let transcriptAttachment = null;
  try {
    transcriptAttachment = await generateTranscriptAttachment(channel);
  } catch (tErr) {
    logger.warn('Failed to generate transcript during close:', tErr.message);
  }

  // 2. Send notification & transcript to User's Direct Message (DM)
  let dmSent = false;
  try {
    const ticketOwner = await interaction.client.users.fetch(ticket.user_id).catch(() => null);
    if (ticketOwner) {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔒 ทิกเก็ตของคุณถูกปิดเรียบร้อยแล้ว')
        .setDescription(`ทิกเก็ตในเซิร์ฟเวอร์ **${interaction.guild.name}** ของคุณถูกปิดเรียบร้อยแล้วครับ`)
        .addFields(
          { name: '🎫 ห้องทิกเก็ต', value: `#${channel.name}`, inline: true },
          { name: '👤 ปิดโดย', value: `${interaction.user.tag}`, inline: true },
          { name: '📅 วันที่ปิด', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: 'ขอบคุณที่ติดต่อสอบถามกับทางเราครับ • XSTOREHUB' })
        .setTimestamp();

      const dmPayload = { embeds: [dmEmbed] };
      if (transcriptAttachment) {
        dmPayload.files = [transcriptAttachment];
      }

      await ticketOwner.send(dmPayload);
      dmSent = true;
    }
  } catch (dmErr) {
    logger.warn(`Could not send DM to user ${ticket.user_id}:`, dmErr.message);
  }

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_ticket_reopen')
      .setLabel('เปิดห้องอีกครั้ง')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔓'),
    new ButtonBuilder()
      .setCustomId('btn_ticket_transcript')
      .setLabel('บันทึกประวัติการคุย')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜'),
    new ButtonBuilder()
      .setCustomId('btn_ticket_delete')
      .setLabel('ลบห้องทิกเก็ต')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  const closedEmbed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🔒 ทิกเก็ตถูกปิดแล้ว')
    .setDescription(
      `ทิกเก็ตนี้ถูกปิดเรียบร้อยแล้วโดย <@${interaction.user.id}>\n` +
      (dmSent
        ? `📩 **ส่งประวัติการคุยไปยังแชทส่วนตัว (DM) ของ <@${ticket.user_id}> เรียบร้อยแล้วครับ**\n\n`
        : `⚠️ *(ไม่สามารถส่งแชทส่วนตัวได้ เนื่องจากผู้ใช้ปิดรับข้อความ DM)*\n\n`) +
      `คุณสามารถกดปุ่มด้านล่างเพื่อเปิดห้องใหม่, บันทึกประวัติ หรือลบห้องได้ครับ`
    )
    .setTimestamp();

  await channel.send({
    embeds: [closedEmbed],
    components: [actionRow]
  });

  // Remove confirmation prompt
  await interaction.message.delete().catch(() => {});
}

async function handleReopenTicket(interaction, { db }) {
  const channel = interaction.channel;
  const ticket = db.getTicketByChannelId(channel.id);

  if (!ticket) {
    return interaction.reply({
      content: '❌ ไม่พบข้อมูลทิกเก็ตของห้องนี้',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  db.reopenTicket(channel.id);

  // Restore user permissions
  try {
    await channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: true
    });
  } catch {}

  const reopenEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🔓 ทิกเก็ตถูกเปิดอีกครั้ง')
    .setDescription(`ทิกเก็ตนี้ถูกเปิดใช้งานอีกครั้งโดย <@${interaction.user.id}>`)
    .setTimestamp();

  await interaction.editReply({ embeds: [reopenEmbed] });
}

async function handleDeleteTicket(interaction, { db }) {
  const channel = interaction.channel;
  await interaction.reply({
    content: '🗑️ **กำลังลบห้องทิกเก็ตนี้ใน 5 วินาที...**'
  });

  setTimeout(async () => {
    try {
      await channel.delete('Ticket deleted by user');
    } catch (err) {
      logger.error('Failed to delete channel:', err);
    }
  }, 5000);
}

async function generateTranscriptAttachment(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = Array.from(messages.values()).reverse();

  let output = `========================================================\n`;
  output += `บันทึกประวัติการสนทนาห้อง: #${channel.name}\n`;
  output += `วันที่ส่งออก: ${new Date().toLocaleString('th-TH')}\n`;
  output += `จำนวนข้อความ: ${sorted.length} ข้อความ\n`;
  output += `========================================================\n\n`;

  for (const msg of sorted) {
    if (msg.author.bot && msg.embeds.length > 0) {
      output += `[${msg.createdAt.toLocaleString('th-TH')}] ${msg.author.tag}: [กล่องข้อความ] ${msg.embeds[0].title || ''} - ${msg.embeds[0].description || ''}\n`;
    } else {
      output += `[${msg.createdAt.toLocaleString('th-TH')}] ${msg.author.tag}: ${msg.content || ''}\n`;
      if (msg.attachments.size > 0) {
        msg.attachments.forEach(att => {
          output += `   ไฟล์แนบ: ${att.url}\n`;
        });
      }
    }
  }

  const buffer = Buffer.from(output, 'utf-8');
  return new AttachmentBuilder(buffer, { name: `ประวัติการคุย-${channel.name}.txt` });
}

async function handleTranscript(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = interaction.channel;
    const attachment = await generateTranscriptAttachment(channel);

    await interaction.editReply({
      content: '📜 **นี่คือไฟล์บันทึกประวัติการแชทของห้องนี้ครับ:**',
      files: [attachment]
    });
  } catch (err) {
    await interaction.editReply({
      content: `❌ ไม่สามารถสร้าง Transcript ได้: \`${err.message}\``
    });
  }
}
