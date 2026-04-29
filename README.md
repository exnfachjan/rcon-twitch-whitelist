# Twitch Whitelist Bot 🎮

[![Docker Hub](https://img.shields.io/docker/pulls/exnfachjan/twitch-whitelist-bot)](https://hub.docker.com/r/exnfachjan/twitch-whitelist-bot)

Ein Bot der Twitch Channel Points Einlösungen mit einem Minecraft Server Whitelist via RCON verbindet. 1

## Features

- 🎯 Reagiert auf Twitch Channel Points Einlösungen
- ✅ Überprüft Minecraft-Usernamen via Mojang API
- 🔒 Jeder Twitch-Account kann nur **einmal** einen Whitelist-Platz einlösen
- 🔄 Automatischer Token-Refresh alle 3 Stunden
- 🤖 Bot antwortet im Twitch-Chat mit Bestätigung oder Fehlermeldung
- 🐳 Docker-basiert – läuft überall identisch

## Schnellstart

```bash
# 1. Repo klonen
git clone https://github.com/exnfachjan/twitch-whitelist-bot
cd twitch-whitelist-bot

# 2. .env erstellen
cp .env.example .env
nano .env  # Werte eintragen

# 3. Starten
docker compose up -d
```

## Oder direkt von Docker Hub

```bash
docker pull exnfachjan/twitch-whitelist-bot:latest
```

## Benötigte .env Werte

| Variable                | Beschreibung                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `TWITCH_CLIENT_ID`      | Twitch App ID von [dev.twitch.tv](https://dev.twitch.tv/console)                                |
| `TWITCH_CLIENT_SECRET`  | Twitch App Secret                                                                               |
| `TWITCH_ACCESS_TOKEN`   | OAuth Access Token (siehe unten)                                                                |
| `TWITCH_REFRESH_TOKEN`  | OAuth Refresh Token (siehe unten)                                                               |
| `TWITCH_BOT_USERNAME`   | Twitch Bot-Account Name                                                                         |
| `TWITCH_BOT_TOKEN`      | Chat Token mit `oauth:` prefix von [twitchtokengenerator.com](https://twitchtokengenerator.com) |
| `TWITCH_CHANNEL`        | Dein Twitch Kanal (ohne #)                                                                      |
| `TWITCH_BROADCASTER_ID` | Deine Twitch User-ID (siehe unten)                                                              |
| `TWITCH_REWARD_TITLE`   | Exakter Name der Kanalpunktebelohnung                                                           |
| `RCON_HOST`             | IP des Minecraft Servers (`host.docker.internal` für localhost)                                 |
| `RCON_PORT`             | RCON Port (Standard: `25575`)                                                                   |
| `RCON_PASSWORD`         | RCON Passwort aus `server.properties`                                                           |

## Tokens generieren

### Access & Refresh Token

Öffne im Browser (ersetze `DEINE_CLIENT_ID`):

```
https://id.twitch.tv/oauth2/authorize?client_id=DEINE_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=channel:read:redemptions+chat:read+chat:edit
```

Den `code` aus der Redirect-URL verwenden:

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=DEINE_CLIENT_ID" \
  -d "client_secret=DEIN_CLIENT_SECRET" \
  -d "code=CODE_AUS_URL" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost"
```

### Broadcaster ID

```bash
curl -H "Client-Id: DEINE_CLIENT_ID" \
     -H "Authorization: Bearer DEIN_ACCESS_TOKEN" \
     "https://api.twitch.tv/helix/users?login=DEIN_KANAL"
```

## Minecraft server.properties

```properties
enable-rcon=true
rcon.port=25575
rcon.password=DEIN_SICHERES_PASSWORT
```

## Bot verwalten

```bash
# Logs
docker compose logs -f

# Neustart
docker compose restart

# Stoppen
docker compose down

# Update
docker compose pull && docker compose up -d
```

## Whitelist Datenbank

Die Datenbank liegt in `./data/whitelist_db.json`. Um einen Eintrag zu entfernen:

```bash
nano data/whitelist_db.json
```

## GitHub Actions (Auto-Build)

Bei jedem Push auf `main` wird automatisch ein neues Docker Image gebaut und auf Docker Hub gepusht.

**Secrets in GitHub setzen:**

- `DOCKERHUB_USERNAME` – Dein Docker Hub Username
- `DOCKERHUB_TOKEN` – Docker Hub Access Token ([hub.docker.com/settings/security](https://hub.docker.com/settings/security))

## License

MIT
