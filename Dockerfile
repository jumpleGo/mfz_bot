FROM node:18-alpine

WORKDIR /app

# Копируем манифесты
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем firebase service account (до основного COPY для явности)
COPY firebase-service-account.json ./

# Копируем весь исходник
COPY . .

CMD ["node", "bot.js"]
