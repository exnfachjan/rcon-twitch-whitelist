import Rcon from "rcon-client";
import fetch from "node-fetch";
import WebSocket from "ws";
import tmi from "tmi.js";
import fs from "fs";
import path from "path";

// ─── CONFIG via ENV ───────────────────────────────────────────────────────────
const CONFIG = {
  twitch: {
    clientId:      process.env.TWITCH_CLIENT_ID,
    clientSecret:  process.env.TWITCH_CLIENT_SECRET,
    accessToken:   process.env.TWITCH_ACCESS_TOKEN,
    refreshToken:  process.env.TWITCH_REFRESH_TOKEN,
    botUsername:   process.env.TWITCH_BOT_USERNAME,
    botToken:      process.env.TWITCH_BOT_TOKEN,
    channel:       process.env.TWITCH_CHANNEL,
    rewardTitle:   process.env.TWITCH_REWARD_TITLE || "SMP",
    broadcasterId: process.env.TWITCH_BROADCASTER_ID,
  },
  rcon: {
    host:     process.env.RCON_HOST     || "host.docker.internal",
    port:     parseInt(process.env.RCON_PORT) || 25575,
    password: process.env.RCON_PASSWORD,
  },
};

// Validierung beim Start
const required = [
  "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_ACCESS_TOKEN",
  "TWITCH_REFRESH_TOKEN", "TWITCH_BOT_USERNAME", "TWITCH_BOT_TOKEN",
  "TWITCH_CHANNEL", "TWITCH_BROADCASTER_ID", "RCON_PASSWORD",
];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Config] Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Token Refresh ────────────────────────────────────────────────────────────
async function refreshAccessToken() {
  console.log("[Token] Erneuere Access Token...");
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: CONFIG.twitch.refreshToken,
        client_id:     CONFIG.twitch.clientId,
        client_secret: CONFIG.twitch.clientSecret,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      CONFIG.twitch.accessToken  = data.access_token;
      CONFIG.twitch.refreshToken = data.refresh_token;
      console.log("[Token] Access Token erfolgreich erneuert ✅");
      return true;
    } else {
      console.error("[Token] Fehler beim Erneuern:", JSON.stringify(data));
      return false;
    }
  } catch (err) {
    console.error("[Token] Fehler:", err.message);
    return false;
  }
}

// Token alle 3 Stunden erneuern
setInterval(refreshAccessToken, 3 * 60 * 60 * 1000);
// ─────────────────────────────────────────────────────────────────────────────

// ─── Whitelist-Datenbank ──────────────────────────────────────────────────────
const DB_FILE = path.resolve("/app/data/whitelist_db.json");

function loadDb() {
  if (!fs.existsSync(DB_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf-8")); }
  catch { return {}; }
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function hasAlreadyRedeemed(twitchUsername) {
  return !!loadDb()[twitchUsername.toLowerCase()];
}

function markAsRedeemed(twitchUsername, mcUsername) {
  const db = loadDb();
  db[twitchUsername.toLowerCase()] = { mcUsername, redeemedAt: new Date().toISOString() };
  saveDb(db);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── TMI Chat Client ──────────────────────────────────────────────────────────
const chatClient = new tmi.Client({
  identity: { username: CONFIG.twitch.botUsername, password: CONFIG.twitch.botToken },
  channels: [CONFIG.twitch.channel],
});
chatClient.on("connected", () =>
  console.log(`[Chat] Verbunden als ${CONFIG.twitch.botUsername} in #${CONFIG.twitch.channel}`)
);
chatClient.connect();
// ─────────────────────────────────────────────────────────────────────────────

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
async function checkMinecraftUsername(username) {
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) return null;
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    return res.status === 200 ? await res.json() : null;
  } catch { return null; }
}

async function runRcon(command) {
  const rcon = new Rcon.Rcon({
    host: CONFIG.rcon.host,
    port: CONFIG.rcon.port,
    password: CONFIG.rcon.password,
  });
  try {
    await rcon.connect();
    const response = await rcon.send(command);
    await rcon.end();
    return response;
  } catch (err) {
    console.error("[RCON] Fehler:", err.message);
    throw err;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Redemption Handler ───────────────────────────────────────────────────────
async function handleRedemption(event) {
  const twitchUsername = event.user_name;
  const rewardTitle    = event.reward.title;
  const mcUsername     = event.user_input?.trim();

  console.log(`[EventSub] ${twitchUsername} löste "${rewardTitle}" ein: "${mcUsername}"`);
  if (rewardTitle !== CONFIG.twitch.rewardTitle) return;

  if (hasAlreadyRedeemed(twitchUsername)) {
    const entry = loadDb()[twitchUsername.toLowerCase()];
    chatClient.say(CONFIG.twitch.channel,
      `@${twitchUsername} ❌ Du hast bereits einen Whitelist-Platz für "${entry.mcUsername}" eingelöst!`
    );
    return;
  }

  if (!mcUsername) {
    chatClient.say(CONFIG.twitch.channel,
      `@${twitchUsername} ❌ Bitte gib deinen Minecraft-Username ein!`
    );
    return;
  }

  const profile = await checkMinecraftUsername(mcUsername);
  if (!profile) {
    chatClient.say(CONFIG.twitch.channel,
      `@${twitchUsername} ❌ Der Minecraft-Username "${mcUsername}" existiert nicht!`
    );
    return;
  }

  const exactName = profile.name;
  try {
    const result = await runRcon(`whitelist add ${exactName}`);
    console.log(`[RCON] whitelist add ${exactName} → ${result}`);
    if (result.includes("already whitelisted")) {
      chatClient.say(CONFIG.twitch.channel,
        `@${twitchUsername} ℹ️ "${exactName}" ist bereits auf der Whitelist!`
      );
    } else {
      markAsRedeemed(twitchUsername, exactName);
      chatClient.say(CONFIG.twitch.channel,
        `@${twitchUsername} ✅ "${exactName}" wurde zur Whitelist hinzugefügt! Viel Spaß 🎮`
      );
    }
  } catch {
    chatClient.say(CONFIG.twitch.channel,
      `@${twitchUsername} ⚠️ Fehler beim Whitelisten – bitte Admin kontaktieren.`
    );
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── EventSub WebSocket ───────────────────────────────────────────────────────
async function startEventSub() {
  const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

  ws.on("open", () => console.log("[EventSub] WebSocket verbunden"));

  ws.on("message", async (data) => {
    const msg  = JSON.parse(data);
    const type = msg.metadata?.message_type;

    if (type === "session_welcome") {
      const sessionId = msg.payload.session.id;
      console.log("[EventSub] Session ID:", sessionId);

      const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          "Client-Id":     CONFIG.twitch.clientId,
          "Authorization": `Bearer ${CONFIG.twitch.accessToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          type:      "channel.channel_points_custom_reward_redemption.add",
          version:   "1",
          condition: { broadcaster_user_id: CONFIG.twitch.broadcasterId },
          transport: { method: "websocket", session_id: sessionId },
        }),
      });

      const json = await res.json();
      if (res.ok) {
        console.log("[EventSub] Subscription registriert ✅");
      } else if (res.status === 401) {
        console.log("[EventSub] Token abgelaufen, erneuere...");
        const refreshed = await refreshAccessToken();
        if (refreshed) ws.close();
      } else {
        console.error("[EventSub] Fehler:", JSON.stringify(json));
      }
    }

    if (type === "notification")    await handleRedemption(msg.payload.event);
    if (type === "session_reconnect") { ws.close(); setTimeout(startEventSub, 1000); }
  });

  ws.on("close", () => {
    console.log("[EventSub] Getrennt, reconnect in 10s...");
    setTimeout(startEventSub, 10000);
  });

  ws.on("error", (err) => console.error("[EventSub] Fehler:", err.message));
}

startEventSub();
