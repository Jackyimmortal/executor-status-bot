'use strict';

require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('./database/db');
const { commandsCollection } = require('./commands');
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');
const logger = require('./utils/logger');

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3002;
const DATABASE_PATH = process.env.DATABASE_PATH || './data/tickets.sqlite';

if (!TOKEN) {
  logger.error('CRITICAL: DISCORD_TOKEN is missing in .env file!');
  process.exit(1);
}

// 1. Initialize Database
const db = getDatabase(DATABASE_PATH);

// 2. Initialize Discord Client with Member and Invite Tracking Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// Cache Invites Map
const guildInvitesCache = new Map();

// 3. Register Event Listeners
client.once('ready', async () => {
  readyEvent.execute(client, { token: TOKEN });

  // Cache invites for each guild
  try {
    for (const guild of client.guilds.cache.values()) {
      const invites = await guild.invites.fetch().catch(() => null);
      if (invites) {
        guildInvitesCache.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
      }
    }
    logger.info('Cached invites for all guilds.');
  } catch (err) {
    logger.warn('Could not cache guild invites:', err.message);
  }
});

client.on('interactionCreate', (interaction) =>
  interactionCreateEvent.execute(interaction, { client, db, commands: commandsCollection })
);

// Track Member Joins and Invites
client.on('guildMemberAdd', async (member) => {
  try {
    const cachedInvites = guildInvitesCache.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch().catch(() => null);

    let usedInviter = null;

    if (cachedInvites && newInvites) {
      const usedInvite = newInvites.find(inv => {
        const prevUses = cachedInvites.get(inv.code) || 0;
        return inv.uses > prevUses;
      });

      if (usedInvite && usedInvite.inviter) {
        usedInviter = usedInvite.inviter;
        db.recordInviteJoin(member.guild.id, usedInviter.id, member.id);
      }

      // Update cache
      guildInvitesCache.set(member.guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
    }

    // Send Welcome Message in #welcome channel
    const welcomeChannel = member.guild.channels.cache.find(
      c => c.name.toLowerCase().includes('welcome')
    );

    if (welcomeChannel) {
      const inviterText = usedInviter ? `<@${usedInviter.id}>` : 'ไม่ระบุ (ลิงก์ทั่วไป)';
      const totalInvites = usedInviter ? db.getInvites(member.guild.id, usedInviter.id).total : 0;

      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`🎉 ยินดีต้อนรับสมาชิกใหม่!`)
        .setDescription(`ยินดีต้อนรับคุณ <@${member.id}> เข้าสู่ **${member.guild.name}** ครับ! ❤️`)
        .addFields(
          { name: '👤 สมาชิกใหม่', value: `<@${member.id}>`, inline: true },
          { name: '📨 เชิญโดย', value: `${inviterText} (${totalInvites} คน)`, inline: true },
          { name: '👥 สมาชิกลำดับที่', value: `#${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `${member.guild.name} • ขอให้สนุกกับการช้อปปิ้งและพูดคุย!` })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
    }
  } catch (err) {
    logger.error('Error handling guildMemberAdd:', err.message);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    db.recordInviteLeave(member.guild.id, member.id);
  } catch (err) {
    logger.warn('Error recording invite leave:', err.message);
  }
});

// 4. Lightweight Keep-Alive HTTP Server (for hosting / health checks)
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'discord-ticket-bot',
      discordReady: client.isReady(),
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Health check HTTP server running on port ${PORT}`);
});

// 5. Connect to Discord
logger.info('Logging in to Discord...');
client.login(TOKEN).catch((err) => {
  logger.error('Failed to log in to Discord:', err.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down cleanly...');
  client.destroy();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down cleanly...');
  client.destroy();
  server.close();
  process.exit(0);
});
