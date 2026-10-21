# ⚡ Roblox Executor Status Bot v1.0.0

A production-grade, highly reliable Discord bot built with **Discord.js v14**, **Node.js LTS**, and persistent **SQLite** (`node:sqlite`). Tracks Roblox executor operational status, security detection telemetry, UNC/sUNC benchmark scores, platform support, and decompiler capabilities using a hybrid architecture combining dual external status APIs and authoritative administrator overrides.

---

## 📌 Architecture Highlights

- **Dual API Provider Engine**:
  - **Primary API**: [Executors.online API](https://executors.online/api/executors)
  - **Secondary API**: [RobloxExecutors.com API](https://robloxexecutors.com/api/v1/executors)
- **Hybrid Data Precedence**: Configurable `API_FIRST` or `MANUAL_FIRST` with automatic conflict detection (`CONFLICT — SOURCES DISAGREE`).
- **Resilient HTTP Client**: Exponential backoff, 429 `Retry-After` honoring, request deduplication, timeout guards, and strict JSON schema validation.
- **Zero-Dependency SQLite**: Native `node:sqlite` storage with WAL mode, parameterized queries, and automatic migrations.
- **Interactive Discord Status Panel**: Dark aesthetic, real-time pagination, platform filter buttons (All, Windows, Android, iOS), and persistent message reconnection.
- **18 Slash Commands**: 9 general lookup/diagnostic commands and 9 RBAC-protected administrative commands with full audit logging.

---

## 📋 Tracked Executors (11 Requested)

| # | Executor | Canonical ID | Aliases & Match Rules | Default Platforms |
|---|----------|--------------|------------------------|-------------------|
| 1 | **Delta** | `delta` | delta, delta executor, delta mobile, delta android, delta ios | Android, iOS |
| 2 | **Xeno** | `xeno` | xeno, xeno executor | Windows |
| 3 | **Real** | `real` | real, project real, projectreal, real executor | Windows |
| 4 | **Madium** | `madium` | madium, madium executor *(does not match Madius)* | Windows |
| 5 | **Solara** | `solara` | solara, solara executor, solara v3 | Windows |
| 6 | **Volcano** | `volcano` | volcano, volcano executor | Windows |
| 7 | **Wave** | `wave` | wave, wave executor, wave freemium, wave premium | Windows |
| 8 | **Velocity** | `velocity` | velocity, velocity executor | Windows |
| 9 | **Volt** | `volt` | volt, volt executor, voltbz | Windows |
| 10 | **SirHurt** | `sirhurt` | sirhurt, sir hurt, sirhurt v4, sirhurt v5 | Windows |
| 11 | **Potassium** | `potassium` | potassium, potassium executor, potassium pro | Windows |

*Executors missing from external APIs and without manual entries display `NOT FOUND IN AVAILABLE SOURCES` without being silently dropped.*

---

## 🚀 Installation & Operations Guide

### 1. Prerequisites (Installing Node.js)
Ensure **Node.js LTS (v22.0.0 or higher)** is installed on your system:
```bash
node -v
npm -v
```

### 2. Opening the Project Folder
Open your terminal in the project directory:
```bash
cd "C:\Users\Administrator\.gemini\antigravity\scratch\executor-status-bot"
```

### 3. Installing Dependencies
Install production dependencies (`discord.js` and `dotenv`):
```bash
npm install
```

### 4. Creating a Discord Application & Bot
1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and enter a name (e.g., `ExecutorStatusBot`).
3. Under **Bot**, click **Add Bot**.
4. Click **Reset Token** and copy your token (keep this secure; never commit it).
5. Ensure **Server Members Intent** and **Message Content Intent** are enabled if required, though standard slash commands and text panels only require basic Guild permissions.

### 5. Inviting the Bot to Your Server
Generate an OAuth2 invite URL:
1. Go to **OAuth2** ➔ **URL Generator**.
2. Select scopes: `bot` and `applications.commands`.
3. Select permissions:
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Use External Emojis`
4. Copy the generated URL and open it in your browser to invite the bot to your Discord server.

### 6. Configuring `.env`
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your credentials:
```env
# Discord Credentials
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_test_guild_id
ADMIN_ROLE_ID=your_admin_role_id
STATUS_CHANNEL_ID=your_announcement_channel_id

# Provider URLs (defaults to official working endpoints)
PRIMARY_API_URL=https://executors.online/api/executors
SECONDARY_API_URL=https://robloxexecutors.com/api/v1/executors

# Polling & Precedence
STATUS_POLL_INTERVAL_SECONDS=300
STALE_THRESHOLD_SECONDS=1800
DEFAULT_SOURCE_PRECEDENCE=API_FIRST
DATABASE_PATH=./data/executor_status.sqlite
LOG_LEVEL=info
```

### 7. Initializing the Database (Migrations)
Execute the database migration to create SQLite tables, indices, and seed the 11 default executors:
```bash
npm run migrate
```

### 8. Deploying Slash Commands
Deploy all 18 slash commands to Discord:
```bash
npm run deploy
```
*Note: Setting `GUILD_ID` in `.env` deploys commands instantly to your server. Omitting `GUILD_ID` deploys commands globally (which can take up to 1 hour).*

### 9. Starting the Bot
Run the bot service:
```bash
npm start
```

### 10. Running Automated Tests
Run the complete built-in test suite (35 automated tests covering DB, HTTP retries, Normalization, Precedence, Conflicts, Permissions, and Embeds):
```bash
npm test
```

### 11. Testing API Connectivity
Run the live verification tool to audit both external APIs and evaluate executor availability:
```bash
node scripts/verify-integration.js
```

---

## 📖 Command Reference

### 🌐 General Commands
| Command | Description |
|---------|-------------|
| `/help` | Complete manual and command reference. |
| `/executor-list` | Lists all monitored executors with quick status badges. |
| `/executor-info <name>` | Technical breakdown (sUNC, UNC, decompiler, multi-instance, security). |
| `/executor-search <query>` | Search executors by keyword or partial name. |
| `/executor-platform <platform>` | Filter status report by Windows, Android, iOS, or Other. |
| `/status-health` | Real-time health metrics (API status, DB stats, Discord ping, uptime). |
| `/api-check` | Comprehensive audit of all 11 executors across Primary & Secondary APIs. |
| `/status-refresh` | Refreshes all active Discord status panels immediately. |
| `/status-panel [channel]` | Creates or reconnects the persistent interactive status panel. |

### 🛡️ Administrative Commands
*Restricted to members with `Administrator`, `ManageGuild`, or the configured `ADMIN_ROLE_ID`.*
| Command | Description |
|---------|-------------|
| `/executor-add <canonical> <display>` | Register a new executor into the tracking system. |
| `/executor-edit <executor> <display>` | Update the display name of an existing executor. |
| `/executor-remove <executor>` | Interactive prompt with buttons to permanently delete an executor. |
| `/executor-status <options...>` | Set manual administrator override record with custom UNC/status. |
| `/status-source <API_FIRST\|MANUAL_FIRST>` | Switch system precedence between API and manual records. |
| `/status-provider` | View external API endpoints, latency, and telemetry. |
| `/status-conflicts` | View all active data contradictions between sources. |
| `/status-sync` | Force an immediate background fetch and update from external APIs. |
| `/status-config` | View non-sensitive bot runtime parameters. |

---

## 🔒 Security & Data Integrity

1. **Anti-Cheat Disclaimer**: Security status (`UNDETECTED` / `DETECTED`) is explicitly presented as reported third-party metadata and never guaranteed.
2. **Credential Redaction**: Tokens, bearer headers, and API keys are automatically sanitized from stdout, stderr, and `logs/app.log`.
3. **Data Protection**: API updates never overwrite manual admin records; manual records are explicitly labeled and never falsely marked as API-verified.
4. **Graceful Degradation**: If external APIs fail or are rate-limited, existing database snapshots are preserved. If APIs are disabled entirely, manual records and all Discord lookup commands continue operating without disruption.

---

## 🛠️ Production Deployment (PM2 Continuous Operation)

To run the bot continuously as a background service:
```bash
npm install -g pm2
pm2 start src/index.js --name "executor-status-bot"
pm2 save
pm2 startup
```
To view real-time logs:
```bash
pm2 logs executor-status-bot
```
