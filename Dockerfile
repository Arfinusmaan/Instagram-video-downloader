FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=7860 \
    DOWNLOAD_TEMP_DIR=/tmp/omnistream

WORKDIR /app

# yt-dlp runs as a child process; ffmpeg/ffprobe are supplied by the npm packages.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates gosu \
    && python3 -m pip install --break-system-packages --no-cache-dir --upgrade yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY server.js ./

RUN npm run build \
    && npm prune --omit=dev \
    && mkdir -p /tmp/omnistream \
    && chown -R node:node /app /tmp/omnistream

EXPOSE 7860
ENTRYPOINT ["sh", "-c", "mkdir -p \"$DOWNLOAD_TEMP_DIR\" && if [ \"$(id -u)\" = \"0\" ]; then chown node:node \"$DOWNLOAD_TEMP_DIR\" && exec gosu node node server.js; else exec node server.js; fi"]
