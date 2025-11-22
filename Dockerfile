FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Копируем firebase-service-account.json из корня сервера в /app
COPY ../firebase-service-account.json ./firebase-service-account.json

CMD ["node", "bot.js"]