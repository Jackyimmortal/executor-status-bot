'use strict';

class PanelRepository {
  constructor(db) {
    this.db = db;
  }

  upsert(guildId, channelId, messageId) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO discord_panels (guild_id, channel_id, message_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, channel_id) DO UPDATE SET
        message_id = excluded.message_id,
        updated_at = excluded.updated_at
    `).run(guildId, channelId, messageId, now, now);

    return this.getByGuildAndChannel(guildId, channelId);
  }

  getByGuildAndChannel(guildId, channelId) {
    return this.db.prepare(`
      SELECT * FROM discord_panels
      WHERE guild_id = ? AND channel_id = ?
      LIMIT 1
    `).get(guildId, channelId);
  }

  getByGuild(guildId) {
    return this.db.prepare(`
      SELECT * FROM discord_panels
      WHERE guild_id = ?
    `).all(guildId);
  }

  getAll() {
    return this.db.prepare(`
      SELECT * FROM discord_panels
      ORDER BY updated_at DESC
    `).all();
  }

  touch(id) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE discord_panels SET updated_at = ? WHERE id = ?
    `).run(now, id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM discord_panels WHERE id = ?').run(id).changes > 0;
  }

  deleteByMessageId(messageId) {
    return this.db.prepare('DELETE FROM discord_panels WHERE message_id = ?').run(messageId).changes > 0;
  }
}

module.exports = PanelRepository;
