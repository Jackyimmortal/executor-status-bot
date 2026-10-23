'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let instance = null;

class TicketDatabase {
  constructor(dbPath = './data/tickets.sqlite') {
    this.dbPath = dbPath;
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }

    this._initTables();
  }

  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL UNIQUE,
        custom_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        category_id TEXT,
        support_role_id TEXT NOT NULL,
        button_label TEXT NOT NULL,
        button_style TEXT NOT NULL DEFAULT 'PRIMARY',
        button_emoji TEXT,
        color TEXT,
        image_url TEXT,
        thumbnail_url TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number INTEGER NOT NULL,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        panel_id INTEGER REFERENCES ticket_panels(id) ON DELETE SET NULL,
        support_role_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at TEXT NOT NULL,
        closed_at TEXT,
        closed_by TEXT
      );

      CREATE TABLE IF NOT EXISTS credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        customer_name TEXT NOT NULL,
        product_name TEXT NOT NULL,
        price TEXT,
        rating INTEGER DEFAULT 5,
        comment TEXT NOT NULL,
        image_url TEXT,
        is_automated INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS member_invites (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        regular INTEGER DEFAULT 0,
        bonus INTEGER DEFAULT 0,
        left_count INTEGER DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS invited_members (
        guild_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        inviter_id TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        PRIMARY KEY (guild_id, member_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ticket_panels_custom_id ON ticket_panels(custom_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_channel_id ON tickets(channel_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON tickets(guild_id, user_id, status);
      CREATE INDEX IF NOT EXISTS idx_credits_guild_id ON credits(guild_id);
    `);
  }

  savePanel(data) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO ticket_panels (
        guild_id, channel_id, message_id, custom_id, title, description,
        category_id, support_role_id, button_label, button_style,
        button_emoji, color, image_url, thumbnail_url, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.guildId,
      data.channelId,
      data.messageId,
      data.customId,
      data.title,
      data.description || null,
      data.categoryId || null,
      data.supportRoleId,
      data.buttonLabel || 'เปิดทิกเก็ต',
      data.buttonStyle || 'PRIMARY',
      data.buttonEmoji || '📩',
      data.color || '#5865F2',
      data.imageUrl || null,
      data.thumbnailUrl || null,
      now
    );

    return Number(result.lastInsertRowid);
  }

  getPanelByCustomId(customId) {
    return this.db.prepare(`
      SELECT * FROM ticket_panels WHERE custom_id = ?
    `).get(customId);
  }

  getPanelByMessageId(messageId) {
    return this.db.prepare(`
      SELECT * FROM ticket_panels WHERE message_id = ?
    `).get(messageId);
  }

  getNextTicketNumber(guildId) {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_num
      FROM tickets
      WHERE guild_id = ?
    `).get(guildId);
    return row ? row.next_num : 1;
  }

  createTicket(guildId, channelId, userId, panelId, supportRoleId) {
    const ticketNum = this.getNextTicketNumber(guildId);
    const now = new Date().toISOString();

    const result = this.db.prepare(`
      INSERT INTO tickets (ticket_number, guild_id, channel_id, user_id, panel_id, support_role_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `).run(ticketNum, guildId, channelId, userId, panelId, supportRoleId, now);

    return {
      id: Number(result.lastInsertRowid),
      ticketNumber: ticketNum
    };
  }

  getTicketByChannelId(channelId) {
    return this.db.prepare(`
      SELECT * FROM tickets WHERE channel_id = ?
    `).get(channelId);
  }

  getUserOpenTicket(guildId, userId) {
    return this.db.prepare(`
      SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'OPEN'
    `).get(guildId, userId);
  }

  closeTicket(channelId, closedBy) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE tickets
      SET status = 'CLOSED', closed_at = ?, closed_by = ?
      WHERE channel_id = ?
    `).run(now, closedBy, channelId);
  }

  reopenTicket(channelId) {
    this.db.prepare(`
      UPDATE tickets
      SET status = 'OPEN', closed_at = NULL, closed_by = NULL
      WHERE channel_id = ?
    `).run(channelId);
  }

  saveCredit(data) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO credits (
        guild_id, channel_id, message_id, customer_name, product_name,
        price, rating, comment, image_url, is_automated, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.guildId,
      data.channelId,
      data.messageId || null,
      data.customerName,
      data.productName,
      data.price || null,
      data.rating || 5,
      data.comment,
      data.imageUrl || null,
      data.isAutomated ? 1 : 0,
      now
    );

    return Number(result.lastInsertRowid);
  }

  getCreditStats(guildId) {
    const row = this.db.prepare(`
      SELECT 
        COUNT(*) as total_credits,
        ROUND(AVG(rating), 1) as avg_rating
      FROM credits
      WHERE guild_id = ?
    `).get(guildId);

    return {
      total: row ? row.total_credits : 0,
      avgRating: (row && row.avg_rating) ? row.avg_rating : 5.0
    };
  }

  getRecentCredits(guildId, limit = 5) {
    return this.db.prepare(`
      SELECT * FROM credits
      WHERE guild_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(guildId, limit);
  }

  // --- Invite Tracking & Pumping Methods ---

  getInvites(guildId, userId) {
    const row = this.db.prepare(`
      SELECT regular, bonus, left_count
      FROM member_invites
      WHERE guild_id = ? AND user_id = ?
    `).get(guildId, userId);

    const regular = row ? row.regular : 0;
    const bonus = row ? row.bonus : 0;
    const leftCount = row ? row.left_count : 0;
    const total = Math.max(0, regular + bonus - leftCount);

    return { regular, bonus, leftCount, total };
  }

  addBonusInvites(guildId, userId, amount) {
    this.db.prepare(`
      INSERT INTO member_invites (guild_id, user_id, regular, bonus, left_count)
      VALUES (?, ?, 0, ?, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET bonus = bonus + ?
    `).run(guildId, userId, amount, amount);

    return this.getInvites(guildId, userId);
  }

  recordInviteJoin(guildId, inviterId, memberId) {
    const now = new Date().toISOString();

    // 1. Record member-inviter relationship
    this.db.prepare(`
      INSERT OR REPLACE INTO invited_members (guild_id, member_id, inviter_id, joined_at)
      VALUES (?, ?, ?, ?)
    `).run(guildId, memberId, inviterId, now);

    // 2. Increment regular count for inviter
    this.db.prepare(`
      INSERT INTO member_invites (guild_id, user_id, regular, bonus, left_count)
      VALUES (?, ?, 1, 0, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET regular = regular + 1
    `).run(guildId, inviterId);

    return this.getInvites(guildId, inviterId);
  }

  recordInviteLeave(guildId, memberId) {
    const record = this.db.prepare(`
      SELECT inviter_id FROM invited_members
      WHERE guild_id = ? AND member_id = ?
    `).get(guildId, memberId);

    if (record) {
      this.db.prepare(`
        UPDATE member_invites
        SET left_count = left_count + 1
        WHERE guild_id = ? AND user_id = ?
      `).run(guildId, record.inviter_id);

      return record.inviter_id;
    }
    return null;
  }

  getInviteLeaderboard(guildId, limit = 10) {
    return this.db.prepare(`
      SELECT 
        user_id,
        regular,
        bonus,
        left_count,
        MAX(0, (regular + bonus - left_count)) as total
      FROM member_invites
      WHERE guild_id = ?
      ORDER BY total DESC
      LIMIT ?
    `).all(guildId, limit);
  }
}

function getDatabase(dbPath = './data/tickets.sqlite') {
  if (!instance) {
    instance = new TicketDatabase(dbPath);
  }
  return instance;
}

module.exports = {
  getDatabase,
  TicketDatabase
};
