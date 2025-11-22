FROM node:18-alpine

WORKDIR /app

# Копируем манифесты
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем весь исходник
COPY . .

# Если firebase-service-account.json лежит в корне репо и тебе правда нужно
# его КОПИРОВАТЬ в образ (см. пункт 2 ниже):
COPY firebase-service-account.json ./firebase-service-account.json

CMD ["node", "bot.js"]
