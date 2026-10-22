'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let instance = null;

class RoleDatabase {
  constructor(dbPath = './data/roles.sqlite') {
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
      CREATE TABLE IF NOT EXISTS panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        color TEXT,
        image_url TEXT,
        thumbnail_url TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_buttons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        panel_id INTEGER NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
        custom_id TEXT NOT NULL UNIQUE,
        role_id TEXT NOT NULL,
        label TEXT NOT NULL,
        style TEXT NOT NULL DEFAULT 'PRIMARY',
        emoji TEXT,
        mode TEXT NOT NULL DEFAULT 'TOGGLE'
      );

      CREATE INDEX IF NOT EXISTS idx_buttons_custom_id ON role_buttons(custom_id);
      CREATE INDEX IF NOT EXISTS idx_panels_message_id ON panels(message_id);
    `);

    // Ensure migration columns exist for existing databases
    try {
      this.db.exec('ALTER TABLE panels ADD COLUMN image_url TEXT;');
    } catch {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE panels ADD COLUMN thumbnail_url TEXT;');
    } catch {
      // Column already exists
    }
  }

  savePanel(guildId, channelId, messageId, title, description, color, imageUrl = null, thumbnailUrl = null) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO panels (guild_id, channel_id, message_id, title, description, color, image_url, thumbnail_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, channelId, messageId, title, description, color, imageUrl, thumbnailUrl, now);

    return Number(result.lastInsertRowid);
  }

  updatePanel(id, { title, description, color, imageUrl, thumbnailUrl }) {
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (imageUrl !== undefined) { updates.push('image_url = ?'); values.push(imageUrl); }
    if (thumbnailUrl !== undefined) { updates.push('thumbnail_url = ?'); values.push(thumbnailUrl); }

    if (updates.length === 0) return;
    values.push(id);

    this.db.prepare(`
      UPDATE panels SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  saveButton(panelId, customId, roleId, label, style, emoji, mode) {
    this.db.prepare(`
      INSERT INTO role_buttons (panel_id, custom_id, role_id, label, style, emoji, mode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(panelId, customId, roleId, label, style, emoji || null, mode);
  }

  getButtonByCustomId(customId) {
    return this.db.prepare(`
      SELECT b.*, p.guild_id, p.channel_id, p.message_id
      FROM role_buttons b
      JOIN panels p ON b.panel_id = p.id
      WHERE b.custom_id = ?
    `).get(customId);
  }

  getButtonsForPanel(panelId) {
    return this.db.prepare(`
      SELECT * FROM role_buttons WHERE panel_id = ?
    `).all(panelId);
  }

  getPanelByMessageId(messageId) {
    return this.db.prepare(`
      SELECT * FROM panels WHERE message_id = ?
    `).get(messageId);
  }

  getAllPanels(guildId) {
    return this.db.prepare(`
      SELECT p.*, COUNT(b.id) as button_count
      FROM panels p
      LEFT JOIN role_buttons b ON p.id = b.panel_id
      WHERE p.guild_id = ?
      GROUP BY p.id
      ORDER BY p.id DESC
    `).all(guildId);
  }
}

function getDatabase(dbPath = './data/roles.sqlite') {
  if (!instance) {
    instance = new RoleDatabase(dbPath);
  }
  return instance;
}

module.exports = {
  getDatabase,
  RoleDatabase
};
