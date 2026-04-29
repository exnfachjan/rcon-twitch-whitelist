FROM node:20-alpine

LABEL org.opencontainers.image.title="Twitch Whitelist Bot"
LABEL org.opencontainers.image.description="Minecraft whitelist bot via Twitch Channel Points & RCON"
LABEL org.opencontainers.image.source="https://github.com/exnfachjan/twitch-whitelist-bot"
LABEL org.opencontainers.image.author="exnfachjan"

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY index.js ./

VOLUME ["/app/data"]

CMD ["node", "index.js"]