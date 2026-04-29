# Twitch Whitelist Bot 🎮

[![Docker Hub](https://img.shields.io/docker/pulls/exnfachjan/twitch-whitelist-bot)](https://hub.docker.com/r/exnfachjan/twitch-whitelist-bot)

A bot that connects Twitch Channel Points redemptions to a Minecraft server whitelist via RCON.

## Features

- 🎯 Reacts to Twitch Channel Points redemptions
- ✅ Validates Minecraft usernames via Mojang API
- 🔒 Each Twitch account can only redeem **one** whitelist spot
- 🔄 Automatic token refresh every 3 hours
- 🤖 Bot replies in Twitch chat with confirmation or error message
- 🐳 Docker-based – runs identically everywhere

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/exnfachjan/twitch-whitelist-bot
cd twitch-whitelist-bot

# 2. Create .env
cp .env.example .env
nano .env  # Fill in your values

# 3. Start
docker compose up -d
```

## Or pull directly from Docker Hub

```bash
docker pull exnfachjan/twitch-whitelist-bot:latest
```

## Required .env Variables

| Variable                | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `TWITCH_CLIENT_ID`      | Twitch App ID from [dev.twitch.tv](https://dev.twitch.tv/console)                                 |
| `TWITCH_CLIENT_SECRET`  | Twitch App Secret                                                                                 |
| `TWITCH_ACCESS_TOKEN`   | OAuth Access Token (see below)                                                                    |
| `TWITCH_REFRESH_TOKEN`  | OAuth Refresh Token (see below)                                                                   |
| `TWITCH_BOT_USERNAME`   | Twitch bot account username                                                                       |
| `TWITCH_BOT_TOKEN`      | Chat token with `oauth:` prefix from [twitchtokengenerator.com](https://twitchtokengenerator.com) |
| `TWITCH_CHANNEL`        | Your Twitch channel name (without #)                                                              |
| `TWITCH_BROADCASTER_ID` | Your Twitch user ID (see below)                                                                   |
| `TWITCH_REWARD_TITLE`   | Exact name of the channel points reward                                                           |
| `RCON_HOST`             | Minecraft server IP (`host.docker.internal` for localhost)                                        |
| `RCON_PORT`             | RCON port (default: `25575`)                                                                      |
| `RCON_PASSWORD`         | RCON password from `server.properties`                                                            |

## Generating Tokens

### Access & Refresh Token

Open in your browser (replace `YOUR_CLIENT_ID`):

```
https://id.twitch.tv/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=channel:read:redemptions+chat:read+chat:edit
```

Use the `code` from the redirect URL:

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=CODE_FROM_URL" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost"
```

### Broadcaster ID

```bash
curl -H "Client-Id: YOUR_CLIENT_ID" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     "https://api.twitch.tv/helix/users?login=YOUR_CHANNEL"
```

## Minecraft server.properties

```properties
enable-rcon=true
rcon.port=25575
rcon.password=YOUR_SECURE_PASSWORD
```

## Managing the Bot

```bash
# Logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update
docker compose pull && docker compose up -d
```

## Whitelist Database

The database is stored in `./data/whitelist_db.json`. To remove an entry (e.g. to allow a re-whitelist):

```bash
nano data/whitelist_db.json
```

## License

MIT
