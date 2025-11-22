FROM node:18-alpine

WORKDIR /app

# Копируем манифесты
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем весь исходник
COPY . .


CMD ["node", "bot.js"]
