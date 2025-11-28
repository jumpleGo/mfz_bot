# 📨 Система очереди сообщений (Message Queue)

## 📋 Описание

Система позволяет отправлять сообщения пользователям бота через Firebase Realtime Database.
Админка добавляет записи в таблицу `message_queue`, бот автоматически их обрабатывает и отправляет.

---

## 🗄️ Структура таблицы `message_queue`

### Поля записи

| Поле | Тип | Описание |
|------|-----|----------|
| `type` | string | Тип сообщения: `"single"` или `"broadcast"` |
| `target` | object | Объект с информацией о получателях |
| `message` | string | Текст сообщения |
| `parseMode` | string\|null | Формат: `"HTML"`, `"Markdown"` или `null` |
| `createdAt` | string | ISO дата создания |
| `createdBy` | string | Email/ID администратора |
| `status` | string | `"pending"`, `"processing"`, `"completed"`, `"failed"` |
| `processedAt` | string\|null | ISO дата обработки |
| `stats` | object\|null | Статистика отправки |
| `error` | string\|null | Сообщение об ошибке (если status = "failed") |

### Варианты target для `type: "single"`

```json
{
  "target": {
    "userId": "123456789"
  }
}
```

### Варианты target для `type: "broadcast"`

**1. Всем пользователям:**
```json
{
  "target": {
    "filter": "all"
  }
}
```

**2. Только с активной подпиской:**
```json
{
  "target": {
    "filter": "withSubscription"
  }
}
```

**3. Только без подписки:**
```json
{
  "target": {
    "filter": "withoutSubscription"
  }
}
```

**4. Конкретному списку пользователей:**
```json
{
  "target": {
    "filter": "userIds",
    "userIds": ["123456789", "987654321", "555555555"]
  }
}
```

### Структура stats после обработки

```json
{
  "stats": {
    "total": 100,
    "sent": 98,
    "failed": 2,
    "errors": [
      {
        "userId": "123456789",
        "username": "test_user",
        "error": "Forbidden: bot was blocked by the user"
      },
      {
        "userId": "987654321",
        "username": "another_user",
        "error": "Bad Request: chat not found"
      }
    ]
  }
}
```

---

## 📝 Примеры использования

### Пример 1: Отправка сообщения одному пользователю

```javascript
// Firebase push
const db = admin.database();
const messageRef = db.ref('message_queue').push();

await messageRef.set({
  type: 'single',
  target: {
    userId: '123456789'
  },
  message: 'Привет! Это тестовое сообщение от администратора.',
  parseMode: null,
  createdAt: new Date().toISOString(),
  createdBy: 'admin@example.com',
  status: 'pending',
  processedAt: null,
  stats: null
});
```

### Пример 2: Массовая рассылка всем пользователям (с HTML)

```javascript
await db.ref('message_queue').push().set({
  type: 'broadcast',
  target: {
    filter: 'all'
  },
  message: '<b>📢 Важное объявление!</b>\n\nУважаемые пользователи, у нас новые тарифы.\n\n<i>Проверьте меню бота.</i>',
  parseMode: 'HTML',
  createdAt: new Date().toISOString(),
  createdBy: 'admin@example.com',
  status: 'pending',
  processedAt: null,
  stats: null
});
```

### Пример 3: Рассылка только подписчикам

```javascript
await db.ref('message_queue').push().set({
  type: 'broadcast',
  target: {
    filter: 'withSubscription'
  },
  message: '🎉 Спасибо за вашу подписку!\n\nМы подготовили для вас эксклюзивный контент.',
  parseMode: null,
  createdAt: new Date().toISOString(),
  createdBy: 'admin@example.com',
  status: 'pending',
  processedAt: null,
  stats: null
});
```

### Пример 4: Рассылка только пользователям без подписки

```javascript
await db.ref('message_queue').push().set({
  type: 'broadcast',
  target: {
    filter: 'withoutSubscription'
  },
  message: '💡 У вас еще нет подписки?\n\nОформите сейчас со скидкой 20%!',
  parseMode: null,
  createdAt: new Date().toISOString(),
  createdBy: 'admin@example.com',
  status: 'pending',
  processedAt: null,
  stats: null
});
```

### Пример 5: Отправка выбранным пользователям

```javascript
await db.ref('message_queue').push().set({
  type: 'broadcast',
  target: {
    filter: 'userIds',
    userIds: ['123456789', '987654321', '555555555']
  },
  message: 'Специальное предложение для вас!',
  parseMode: null,
  createdAt: new Date().toISOString(),
  createdBy: 'admin@example.com',
  status: 'pending',
  processedAt: null,
  stats: null
});
```

---

## 🔄 Жизненный цикл сообщения

```
┌──────────────┐
│   Админка    │
│ создает запись│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   pending    │ ← Ожидает обработки
└──────┬───────┘
       │
       ▼ (Бот обнаруживает)
┌──────────────┐
│ processing   │ ← Бот начал отправку
└──────┬───────┘
       │
       ▼ (Все отправлено)
┌──────────────┐
│  completed   │ ← Завершено успешно
│   + stats    │
└──────────────┘

или

       ▼ (Ошибка)
┌──────────────┐
│   failed     │ ← Ошибка обработки
│   + error    │
└──────────────┘
```

---

## 🎨 Форматирование текста

### HTML форматирование

```javascript
message: '<b>Жирный текст</b>\n<i>Курсив</i>\n<code>Моноширинный</code>\n<a href="https://example.com">Ссылка</a>',
parseMode: 'HTML'
```

**Поддерживаемые теги:**
- `<b>text</b>` или `<strong>text</strong>` - жирный
- `<i>text</i>` или `<em>text</em>` - курсив
- `<u>text</u>` - подчеркнутый
- `<s>text</s>` - зачеркнутый
- `<code>text</code>` - моноширинный
- `<pre>text</pre>` - преформатированный
- `<a href="url">text</a>` - ссылка

### Markdown форматирование

```javascript
message: '*Жирный текст*\n_Курсив_\n`Моноширинный`\n[Ссылка](https://example.com)',
parseMode: 'Markdown'
```

### Без форматирования

```javascript
message: 'Обычный текст без форматирования',
parseMode: null
```

---

## 📊 Мониторинг и отладка

### Логи бота

Бот выводит подробные логи:

```
👂 Слушатель очереди сообщений запущен...
📨 Новое сообщение в очереди: -N1234567890
📊 Начинаем рассылку для 150 пользователей...
✅ [1/150] Отправлено: 123456789
✅ [2/150] Отправлено: 987654321
❌ [3/150] Ошибка: 555555555 - Forbidden: bot was blocked by the user
...
📊 Рассылка завершена: 148 отправлено, 2 ошибок
✅ Сообщение -N1234567890 обработано: 148/150 отправлено
🔄 Сообщение обновлено: -N1234567890 - статус: completed
```

### Проверка статуса через Firebase Console

1. Открыть Firebase Console
2. Перейти в Realtime Database
3. Найти `message_queue`
4. Проверить статус сообщения

---

## ⚙️ Настройки и ограничения

### Rate Limiting

Бот отправляет сообщения с задержкой **100ms** между каждым, чтобы не превысить лимиты Telegram:
- Telegram Bot API: ~30 сообщений в секунду
- Наша скорость: ~10 сообщений в секунду (безопасный запас)

### Автоочистка старых сообщений

Для очистки старых записей можно добавить в крон:

```javascript
// В bot.js или отдельный скрипт
const { cleanupOldMessages } = require('./services/messageQueueService');

// Запускать раз в день
setInterval(async () => {
  await cleanupOldMessages(7); // Удалить сообщения старше 7 дней
}, 24 * 60 * 60 * 1000);
```

---

## 🔐 Безопасность

### Рекомендации для админки

1. **Аутентификация**: Используйте Firebase Authentication для доступа к админке
2. **Правила безопасности**: Настройте Firebase Security Rules

```json
{
  "rules": {
    "message_queue": {
      ".read": "auth != null && auth.token.admin === true",
      ".write": "auth != null && auth.token.admin === true"
    }
  }
}
```

3. **Валидация**: Проверяйте входные данные перед записью в базу
4. **Логирование**: Сохраняйте `createdBy` для аудита

---

## 🚀 Интеграция с фронтендом

### Пример кода для админки (Vue/Nuxt)

```vue
<template>
  <div>
    <h2>Отправить сообщение</h2>
    
    <select v-model="messageType">
      <option value="single">Одному пользователю</option>
      <option value="broadcast">Массовая рассылка</option>
    </select>
    
    <!-- Для single -->
    <input v-if="messageType === 'single'" 
           v-model="userId" 
           placeholder="User ID" />
    
    <!-- Для broadcast -->
    <select v-if="messageType === 'broadcast'" v-model="broadcastFilter">
      <option value="all">Все пользователи</option>
      <option value="withSubscription">С подпиской</option>
      <option value="withoutSubscription">Без подписки</option>
      <option value="userIds">Выбранные пользователи</option>
    </select>
    
    <textarea v-model="message" placeholder="Текст сообщения"></textarea>
    
    <select v-model="parseMode">
      <option :value="null">Без форматирования</option>
      <option value="HTML">HTML</option>
      <option value="Markdown">Markdown</option>
    </select>
    
    <button @click="sendMessage">Отправить</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { getDatabase, ref as dbRef, push, set } from 'firebase/database';

const messageType = ref('single');
const userId = ref('');
const broadcastFilter = ref('all');
const message = ref('');
const parseMode = ref(null);

async function sendMessage() {
  const db = getDatabase();
  const messageQueueRef = dbRef(db, 'message_queue');
  
  const target = messageType.value === 'single'
    ? { userId: userId.value }
    : { filter: broadcastFilter.value };
  
  const newMessageRef = push(messageQueueRef);
  
  await set(newMessageRef, {
    type: messageType.value,
    target,
    message: message.value,
    parseMode: parseMode.value,
    createdAt: new Date().toISOString(),
    createdBy: 'admin@example.com', // Получить из auth
    status: 'pending',
    processedAt: null,
    stats: null
  });
  
  alert('Сообщение добавлено в очередь!');
  message.value = '';
}
</script>
```

---

## ❓ FAQ

**Q: Как быстро бот обрабатывает сообщения?**  
A: Практически мгновенно. Слушатель Firebase реагирует на изменения в реальном времени.

**Q: Можно ли отменить рассылку после добавления в очередь?**  
A: Да, но только если статус еще `pending`. Удалите запись или измените статус на `cancelled`.

**Q: Что делать если много ошибок при рассылке?**  
A: Проверьте поле `stats.errors` - там будут детали. Частые причины:
- `bot was blocked by the user` - пользователь заблокировал бота
- `chat not found` - неверный userId
- `message is too long` - сообщение слишком длинное (>4096 символов)

**Q: Можно ли отправлять изображения?**  
A: В текущей версии только текст. Для изображений нужно расширить систему.

---

## 📚 Дополнительно

- [Telegram Bot API - Formatting](https://core.telegram.org/bots/api#formatting-options)
- [Firebase Realtime Database - Listeners](https://firebase.google.com/docs/database/web/read-and-write)
