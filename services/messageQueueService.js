const { getDatabase } = require('../config/firebase');
const { getAllUsers, getUserById } = require('./userService');
const { getActiveSubscription } = require('./paymentService');

/**
 * Инициализация слушателя очереди сообщений
 */
function initMessageQueueListener(bot) {
  const db = getDatabase();
  const queueRef = db.ref('message_queue');

  console.log('👂 Слушатель очереди сообщений запущен...');

  // Слушаем добавление новых сообщений
  queueRef.on('child_added', async (snapshot) => {
    const messageId = snapshot.key;
    const messageData = snapshot.val();

    // Обрабатываем только сообщения со статусом "pending"
    if (messageData.status !== 'pending') {
      return;
    }

    console.log(`📨 Новое сообщение в очереди: ${messageId}`);

    try {
      // Меняем статус на "processing"
      await queueRef.child(messageId).update({
        status: 'processing',
        processedAt: new Date().toISOString()
      });

      // Обрабатываем сообщение
      const stats = await processMessage(bot, messageData);

      // Обновляем статус на "completed"
      await queueRef.child(messageId).update({
        status: 'completed',
        stats
      });

      console.log(`✅ Сообщение ${messageId} обработано: ${stats.sent}/${stats.total} отправлено`);
    } catch (error) {
      console.error(`❌ Ошибка обработки сообщения ${messageId}:`, error);

      // Обновляем статус на "failed"
      await queueRef.child(messageId).update({
        status: 'failed',
        error: error.message
      });
    }
  });

  // Опционально: слушаем изменения для отладки
  queueRef.on('child_changed', (snapshot) => {
    console.log(`🔄 Сообщение обновлено: ${snapshot.key} - статус: ${snapshot.val().status}`);
  });
}

/**
 * Обработка и отправка сообщения
 */
async function processMessage(bot, messageData) {
  const { type, target, message, parseMode } = messageData;

  const options = {};
  if (parseMode) {
    options.parse_mode = parseMode;
  }

  if (type === 'single') {
    // Отправка одному пользователю
    return await sendToSingleUser(bot, target.userId, message, options);
  } else if (type === 'broadcast') {
    // Массовая рассылка
    return await sendBroadcast(bot, target, message, options);
  } else {
    throw new Error(`Неизвестный тип сообщения: ${type}`);
  }
}

/**
 * Отправка сообщения одному пользователю
 */
async function sendToSingleUser(bot, userId, message, options) {
  const stats = {
    total: 1,
    sent: 0,
    failed: 0,
    errors: []
  };

  try {
    await bot.sendMessage(userId, message, options);
    stats.sent = 1;
    console.log(`✅ Сообщение отправлено пользователю ${userId}`);
  } catch (error) {
    stats.failed = 1;
    stats.errors.push({
      userId,
      error: error.message
    });
    console.error(`❌ Ошибка отправки пользователю ${userId}:`, error.message);
  }

  return stats;
}

/**
 * Массовая рассылка
 */
async function sendBroadcast(bot, target, message, options) {
  const stats = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  let targetUsers = [];

  // Определяем список получателей в зависимости от фильтра
  if (target.filter === 'all') {
    // Все пользователи
    targetUsers = await getAllUsers();
  } else if (target.filter === 'withSubscription') {
    // Только с активной подпиской
    const allUsers = await getAllUsers();
    for (const user of allUsers) {
      const subscription = await getActiveSubscription(user.userId);
      if (subscription) {
        targetUsers.push(user);
      }
    }
  } else if (target.filter === 'withoutSubscription') {
    // Только без подписки
    const allUsers = await getAllUsers();
    for (const user of allUsers) {
      const subscription = await getActiveSubscription(user.userId);
      if (!subscription) {
        targetUsers.push(user);
      }
    }
  } else if (target.filter === 'userIds' && target.userIds) {
    // Конкретный список пользователей
    for (const userId of target.userIds) {
      const user = await getUserById(userId);
      if (user) {
        targetUsers.push(user);
      }
    }
  }

  stats.total = targetUsers.length;
  console.log(`📊 Начинаем рассылку для ${stats.total} пользователей...`);

  // Отправляем сообщения с задержкой (защита от rate limit)
  for (const user of targetUsers) {
    try {
      await bot.sendMessage(user.userId, message, options);
      stats.sent++;
      console.log(`✅ [${stats.sent}/${stats.total}] Отправлено: ${user.userId}`);
    } catch (error) {
      stats.failed++;
      stats.errors.push({
        userId: user.userId,
        username: user.username,
        error: error.message
      });
      console.error(`❌ [${stats.sent + stats.failed}/${stats.total}] Ошибка: ${user.userId} - ${error.message}`);
    }

    // Задержка 100ms между сообщениями (Telegram rate limit: ~30 msg/sec)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`📊 Рассылка завершена: ${stats.sent} отправлено, ${stats.failed} ошибок`);
  return stats;
}

/**
 * Очистка старых обработанных сообщений (запускать по крону)
 */
async function cleanupOldMessages(daysOld = 7) {
  const db = getDatabase();
  const queueRef = db.ref('message_queue');
  
  const snapshot = await queueRef.once('value');
  const messages = snapshot.val();
  
  if (!messages) return;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  let deletedCount = 0;
  
  for (const [messageId, messageData] of Object.entries(messages)) {
    if (messageData.status === 'completed' || messageData.status === 'failed') {
      const createdAt = new Date(messageData.createdAt);
      
      if (createdAt < cutoffDate) {
        await queueRef.child(messageId).remove();
        deletedCount++;
      }
    }
  }
  
  console.log(`🧹 Очищено ${deletedCount} старых сообщений`);
}

module.exports = {
  initMessageQueueListener,
  cleanupOldMessages
};
