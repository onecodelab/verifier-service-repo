FROM node:20-slim

# Install latest chrome dev package and fonts to support major charsets
# This installs necessary libs for Puppeteer's bundled Chromium to work
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (including puppeteer which installs chromium)
RUN npm ci

# Copy source
COPY . .

# Build the app (compiles TS to JS in dist/)
RUN npm run build

# Expose port (Render sets PORT env var, but good to document)
EXPOSE 3000

# Start the app
CMD [ "npm", "start" ]
