FROM node:18-alpine

WORKDIR /app

# Копируем package.json из app/
COPY app/package*.json ./
RUN npm ci --only=production


# Копируем остальные файлы проекта из app/
COPY app/ .
# Копируем firebase-service-account.json из корня
COPY firebase-service-account.json ./firebase-service-account.json

CMD ["node", "bot.js"]