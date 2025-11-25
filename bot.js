require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { initializeFirebase } = require('./config/firebase');
const { getActiveTariffs, getTariffById } = require('./services/tariffService');
const { getPaymentMethods, createPayment, updatePaymentStatus, saveInviteLink, getPaymentByKey, getPaymentByUserIdWithInviteLink, saveSubscriptionEndDate, getExpiredSubscriptions, markSubscriptionAsExpired, getSubscriptionsNeedingNotification, markNotificationSent, getActiveSubscription, extendSubscription } = require('./services/paymentService');
const { createReminder, getRemindersToSend, markReminderAsSent, hasActiveReminder } = require('./services/reminderService');
const { saveUser } = require('./services/userService');
const { isAltsWatcherAvailable, getNextAltsWatcherDate, getNextReminderDate, formatDateForUser, isCloseToOpening, getTimeUntilOpening } = require('./utils/dateUtils');
const {
  getMainMenuKeyboard,
  getTariffsKeyboard,
  getPaymentMethodsKeyboard,
  getPaymentConfirmationKeyboard,
  getAdminConfirmationKeyboard,
  getBackToMainKeyboard,
  getVariantsKeyboard,
  getReminderKeyboard
} = require('./utils/keyboards');

// Инициализация Firebase
initializeFirebase();

// Создание бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
  polling: {
    allowed_updates: ['message', 'callback_query']
  }
});

// Хранилище временных данных пользователей
const userSessions = new Map();

// Вспомогательная функция для склонения месяцев
function getMonthsText(months) {
  if (months === 1) return 'месяц';
  if (months >= 2 && months <= 4) return 'месяца';
  return 'месяцев';
}

function getHoursText(hours) {
  if (hours === 1 || hours === 21) return 'час';
  if ((hours >= 2 && hours <= 4) || (hours >= 22 && hours <= 24)) return 'часа';
  return 'часов';
}

function getMinutesText(minutes) {
  if (minutes === 1 || minutes === 21 || minutes === 31 || minutes === 41 || minutes === 51) return 'минута';
  if ((minutes >= 2 && minutes <= 4) || (minutes >= 22 && minutes <= 24) || (minutes >= 32 && minutes <= 34) || (minutes >= 42 && minutes <= 44) || (minutes >= 52 && minutes <= 54)) return 'минуты';
  return 'минут';
}

console.log('🤖 Бот запущен...');
console.log('📡 Подписка на обновления: message, callback_query');

// Проверка доступа к каналу
async function checkChannelAccess() {
  try {
    const channelId = process.env.CHANNEL_ID;
    console.log(channelId)
    if (!channelId) {
      console.error('⚠️  CHANNEL_ID не указан в .env');
      return;
    }

    const chat = await bot.getChat(channelId);
    console.log(chat)
    
    const botInfo = await bot.getMe();
    const botMember = await bot.getChatMember(channelId, botInfo.id);
    console.log(botMember)
    
    console.log('✅ Канал найден:', chat.title);
    console.log('✅ Статус бота в канале:', botMember.status);
    
    if (botMember.status !== 'administrator') {
      console.error('⚠️  Бот не является администратором канала! Добавьте бота как администратора с правом "Invite users via link"');
    } else {
      console.log('✅ Бот имеет права администратора');
    }
  } catch (error) {
    console.error('❌ Ошибка доступа к каналу:', error.message);
    console.error('Проверьте:');
    console.error('1. CHANNEL_ID правильно указан в .env (должен начинаться с -100)');
    console.error('2. Бот добавлен в канал как администратор');
    console.error('3. У бота есть право "Invite users via link"');
  }
}

// Отправка уведомлений о скором окончании подписки
async function sendExpirationNotifications() {
  try {
    console.log('📬 Проверка подписок для отправки уведомлений...');
    
    const { twoDays, eightHours } = await getSubscriptionsNeedingNotification();
    
    // Отправка уведомлений за 2 дня
    for (const subscription of twoDays) {
      try {
        const endDate = new Date(subscription.subscriptionEndDate);
        const formattedDate = endDate.toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        await bot.sendMessage(
          subscription.userId,
          `⏰ Напоминание о подписке\n\n` +
          `Ваша подписка на тариф "${subscription.tariffName}" скоро закончится!\n\n` +
          `📅 Дата окончания: ${formattedDate}\n\n` +
          `💡 Вы можете продлить подписку прямо сейчас, чтобы не потерять доступ к каналу.\n\n` +
          `Используйте /start для оформления новой подписки.`
        );
        
        await markNotificationSent(subscription.key, '2days');
        console.log(`✅ Уведомление за 2 дня отправлено пользователю ${subscription.userTelegram}`);
      } catch (error) {
        console.error(`❌ Ошибка отправки уведомления за 2 дня пользователю ${subscription.userId}:`, error.message);
      }
    }
    
    // Отправка уведомлений за 8 часов
    for (const subscription of eightHours) {
      try {
        const endDate = new Date(subscription.subscriptionEndDate);
        const formattedDate = endDate.toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        await bot.sendMessage(
          subscription.userId,
          `🚨 СРОЧНО: Подписка заканчивается!\n\n` +
          `Ваша подписка на тариф "${subscription.tariffName}" закончится менее чем через 8 часов!\n\n` +
          `📅 Дата окончания: ${formattedDate}\n\n` +
          `⚠️ Продлите подписку сейчас, чтобы не потерять доступ к каналу.\n\n` +
          `Используйте /start для продления.`
        );
        
        await markNotificationSent(subscription.key, '8hours');
        console.log(`✅ Уведомление за 8 часов отправлено пользователю ${subscription.userTelegram}`);
      } catch (error) {
        console.error(`❌ Ошибка отправки уведомления за 8 часов пользователю ${subscription.userId}:`, error.message);
      }
    }
    
    const totalSent = twoDays.length + eightHours.length;
    if (totalSent > 0) {
      console.log(`✅ Отправлено уведомлений: ${totalSent} (2 дня: ${twoDays.length}, 8 часов: ${eightHours.length})`);
    } else {
      console.log('✅ Уведомлений для отправки не найдено');
    }
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомлений:', error);
  }
}

// Проверка истекших подписок
async function checkExpiredSubscriptions() {
  try {
    console.log('🔍 Проверка истекших подписок...');
    
    const expiredUsers = await getExpiredSubscriptions();
    
    if (expiredUsers.length === 0) {
      console.log('✅ Истекших подписок не найдено');
      return;
    }
    
    console.log(`⚠️ Найдено ${expiredUsers.length} истекших подписок`);
    
    const channelId = process.env.CHANNEL_ID;
    if (!channelId) {
      console.error('❌ CHANNEL_ID не указан в .env');
      return;
    }
    
    for (const user of expiredUsers) {
      try {
        // Проверяем, состоит ли пользователь в канале
        const member = await bot.getChatMember(channelId, user.userId);
        
        if (member.status !== 'left' && member.status !== 'kicked') {
          // Удаляем пользователя из канала
          await bot.banChatMember(channelId, user.userId);
          // Сразу разбаниваем, чтобы пользователь мог вернуться по новой подписке
          await bot.unbanChatMember(channelId, user.userId);
          
          console.log(`✅ Пользователь ${user.userTelegram} (${user.userId}) удален из канала`);
          
          // Уведомляем пользователя об окончании подписки
          await bot.sendMessage(
            user.userId,
            `❌ Ваша подписка закончилась\n\n` +
            `Подписка на тариф "${user.tariffName}" истекла, и вы были удалены из канала.\n\n` +
            `💡 Вы можете купить подписку заново и снова получить доступ к каналу!\n\n` +
            `Используйте /start для оформления новой подписки.`
          ).catch(err => console.error('Не удалось отправить уведомление пользователю:', err.message));
        }
        
        // Помечаем подписку как истекшую
        await markSubscriptionAsExpired(user.key);
        
      } catch (error) {
        console.error(`❌ Ошибка при обработке пользователя ${user.userId}:`, error.message);
      }
    }
    
    console.log('✅ Проверка истекших подписок завершена');
  } catch (error) {
    console.error('❌ Ошибка при проверке истекших подписок:', error);
  }
}

// Проверка и отправка напоминаний о доступности тарифов
async function sendReminders() {
  try {
    console.log('🔔 Проверка напоминаний...');
    
    const reminders = await getRemindersToSend();
    
    if (reminders.length === 0) {
      console.log('✅ Напоминаний для отправки не найдено');
      return;
    }
    
    console.log(`📬 Найдено ${reminders.length} напоминаний для отправки`);
    
    for (const reminder of reminders) {
      try {
        const nextDate = getNextAltsWatcherDate();
        
        await bot.sendMessage(
          reminder.userId,
          `🔔 Напоминание о доступности тарифа!\n\n` +
          `Тариф "${reminder.tariffName}" будет доступен для покупки 26 и 27 числа.\n\n` +
          `📅 Следующая дата: ${formatDateForUser(nextDate)}\n\n` +
          `Не упустите возможность оформить подписку!\n\n` +
          `Используйте /start для покупки.`
        );
        
        await markReminderAsSent(reminder.key);
        console.log(`✅ Напоминание отправлено пользователю ${reminder.userId}`);
        
      } catch (error) {
        console.error(`❌ Ошибка отправки напоминания для ${reminder.userId}:`, error.message);
      }
    }
    
    console.log('✅ Проверка напоминаний завершена');
  } catch (error) {
    console.error('❌ Ошибка при проверке напоминаний:', error);
  }
}

// Запускаем проверки после инициализации бота
(async () => {
  try {
    console.log('🚀 Инициализация проверок...');
    
    await checkChannelAccess();
    
    // Первая проверка сразу после запуска
    await checkExpiredSubscriptions();
    await sendExpirationNotifications();
    await sendReminders();
    
    // Проверяем истекшие подписки каждые 6 часов
    setInterval(checkExpiredSubscriptions, 6 * 60 * 60 * 1000);
    
    // Проверяем уведомления каждый час
    setInterval(sendExpirationNotifications, 60 * 60 * 1000);
    
    // Проверяем напоминания каждый час
    setInterval(sendReminders, 60 * 60 * 1000);
    
    console.log('✅ Все проверки запущены');
  } catch (error) {
    console.error('❌ Ошибка инициализации проверок:', error);
  }
})();

// === КОМАНДЫ ===

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.username || msg.from.first_name;

  // Сохраняем пользователя в базу данных
  await saveUser(msg.from);

  await bot.sendMessage(
    chatId,
    `👋 Привет, ${userName}!\n\nДобро пожаловать в бот подписок MoneyFlowZen.\n\nВыберите действие:`,
    getMainMenuKeyboard()
  );
});

// Команда проверки канала (только для админа)
bot.onText(/\/check_channel/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Проверяем, что это админ
  if (userId.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    return;
  }

  await checkChannelAccess();
  await bot.sendMessage(chatId, 'Проверка завершена, смотрите логи в консоли.');
});

// Команда подтверждения присоединения к каналу
bot.onText(/\/joined/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Ищем платеж с активной ссылкой
    const payment = await getPaymentByUserIdWithInviteLink(userId);
    
    if (!payment || !payment.inviteLink) {
      await bot.sendMessage(
        chatId,
        '❌ У вас нет активной пригласительной ссылки.\n\nЕсли вы уже использовали ссылку, она была отозвана автоматически.'
      );
      return;
    }

    // Проверяем, что пользователь действительно в канале
    try {
      const member = await bot.getChatMember(process.env.CHANNEL_ID, userId);
      
      if (member.status === 'left' || member.status === 'kicked') {
        await bot.sendMessage(
          chatId,
          '❌ Вы не состоите в канале.\n\nСначала присоединитесь по ссылке, затем используйте эту команду.'
        );
        return;
      }

      // Отзываем ссылку
      await bot.revokeChatInviteLink(process.env.CHANNEL_ID, payment.inviteLink);
      await saveInviteLink(payment.key, null);
      userSessions.delete(userId);

      console.log(`✅ Ссылка вручную отозвана пользователем ${userId} через команду /joined`);

      await bot.sendMessage(
        chatId,
        '✅ Отлично! Ваша пригласительная ссылка была отозвана.\n\nТеперь никто другой не сможет использовать её для входа в канал.'
      );
    } catch (error) {
      console.error('Ошибка проверки членства:', error);
      await bot.sendMessage(
        chatId,
        '⚠️ Не удалось проверить ваше членство в канале.\n\nЕсли вы присоединились, ссылка будет автоматически отозвана через 30 минут.'
      );
    }
  } catch (error) {
    console.error('Ошибка обработки команды /joined:', error);
    await bot.sendMessage(
      chatId,
      '❌ Произошла ошибка при обработке команды.'
    );
  }
});

// === ОБРАБОТЧИКИ CALLBACK ===

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const userId = query.from.id;
  const userName = query.from.username || query.from.first_name;

  try {
    // Главное меню
    if (data === 'back_to_main') {
      await bot.editMessageText(
        '📋 Главное меню\n\nВыберите действие:',
        {
          chat_id: chatId,
          message_id: messageId,
          ...getMainMenuKeyboard()
        }
      );
    }

    // Информация
    else if (data === 'info') {
      await bot.editMessageText(
        'ℹ️ Информация о боте\n\nЭтот бот позволяет оформить подписку на каналы MoneyFlowZen.\n\nПосле оплаты вы получите одноразовую ссылку для вступления в канал.',
        {
          chat_id: chatId,
          message_id: messageId,
          ...getBackToMainKeyboard()
        }
      );
    }

    // Выбор подписки
    else if (data === 'select_subscription') {
      const tariffs = await getActiveTariffs();

      if (tariffs.length === 0) {
        await bot.editMessageText(
          '❌ К сожалению, сейчас нет доступных тарифов.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...getBackToMainKeyboard()
          }
        );
        return;
      }

      await bot.editMessageText(
        '💳 Выберите тариф:',
        {
          chat_id: chatId,
          message_id: messageId,
          ...getTariffsKeyboard(tariffs)
        }
      );
    }

    // Выбор тарифа
    else if (data.startsWith('tariff_')) {
      const tariffId = data.replace('tariff_', '');
      const tariff = await getTariffById(tariffId);

      if (!tariff) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Тариф не найден', show_alert: true });
        return;
      }

      // Проверяем наличие вариантов
      if (!tariff.variants || Object.keys(tariff.variants).length === 0) {
        await bot.answerCallbackQuery(query.id, { text: '❌ У тарифа нет доступных вариантов', show_alert: true });
        return;
      }

      // Проверяем ограничения по датам для тарифа altsWatcher
      if (tariffId === 'altsWatcher' && !isAltsWatcherAvailable()) {
        let message = `⏰ Тариф "${tariff.name}" доступен для покупки только 26 и 27 числа каждого месяца (00:00-23:59 МСК).\n\n`;
        
        // Если близко к открытию (25 число после 18:00), показываем обратный отсчет
        if (isCloseToOpening()) {
          const timeLeft = getTimeUntilOpening();
          
          message += `⏳ До начала открытия набора осталось:\n`;
          message += `⏰ ${timeLeft.hours} ${getHoursText(timeLeft.hours)} ${timeLeft.minutes} ${getMinutesText(timeLeft.minutes)}\n\n`;
          message += `Возвращайтесь в 00:00 МСК, чтобы оформить подписку! 🎯`;
          
          await bot.editMessageText(
            message,
            {
              chat_id: chatId,
              message_id: messageId,
              ...getBackToMainKeyboard()
            }
          );
        } else {
          // Предлагаем установить напоминание
          const nextDate = getNextAltsWatcherDate();
          const reminderDate = getNextReminderDate();
          
          message += `📅 Следующая дата доступности: ${formatDateForUser(nextDate)}\n\n`;
          message += `💡 Хотите, чтобы я напомнил вам о возможности покупки?\n`;
          message += `Напоминание будет отправлено ${formatDateForUser(reminderDate)} по Вашему локальному времени.`;
          
          await bot.editMessageText(
            message,
            {
              chat_id: chatId,
              message_id: messageId,
              ...getReminderKeyboard(tariffId)
            }
          );
        }
        
        return;
      }

      // Сохраняем выбранный тариф в сессии
      userSessions.set(userId, {
        tariffId,
        tariffName: tariff.name,
        currencyCode: tariff.currencyCode || '₽'
      });

      // Формируем сообщение с информацией о тарифе
      let tariffMessage = `📦 Выбран тариф: ${tariff.name}\n`;
      
      // Добавляем описание, если оно есть
      if (tariff.description) {
        tariffMessage += `\n📝 Описание:\n${tariff.description}\n`;
      }
      
      tariffMessage += `\n⏰ Выберите срок подписки:`;

      await bot.editMessageText(
        tariffMessage,
        {
          chat_id: chatId,
          message_id: messageId,
          ...getVariantsKeyboard(tariff.variants, tariffId, tariff.currencyCode || '₽')
        }
      );
    }

    // Выбор варианта подписки
    else if (data.startsWith('variant_')) {
      const [, tariffId, variantId] = data.split('_');
      const tariff = await getTariffById(tariffId);

      if (!tariff || !tariff.variants || !tariff.variants[variantId]) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Вариант не найден', show_alert: true });
        return;
      }

      const variant = tariff.variants[variantId];

      // Обновляем сессию с выбранным вариантом
      const session = userSessions.get(userId) || {};
      session.tariffId = tariffId;
      session.tariffName = tariff.name;
      session.price = variant.price;
      session.months = variant.months;
      session.currencyCode = tariff.currencyCode || '₽';
      userSessions.set(userId, session);

      // Получаем методы оплаты
      const paymentMethods = await getPaymentMethods();

      if (paymentMethods.length === 0) {
        await bot.editMessageText(
          '❌ К сожалению, сейчас нет доступных методов оплаты.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...getBackToMainKeyboard()
          }
        );
        return;
      }

      // Формируем сообщение
      let message = `📦 Тариф: ${tariff.name}\n`;
      message += `⏰ Срок: ${variant.months} ${getMonthsText(variant.months)}\n`;
      message += `💰 Цена: ${variant.price} ${session.currencyCode}\n`;
      
      // Показываем экономию, если не базовый вариант
      if (variant.months > 1) {
        const pricePerMonth = variant.price / variant.months;
        const baseVariant = Object.values(tariff.variants).find(v => v.months === 1);
        if (baseVariant) {
          const savings = (baseVariant.price * variant.months) - variant.price;
          if (savings > 0) {
            message += `💎 Экономия: ${Math.round(savings)} ${session.currencyCode}\n`;
          }
        }
      }
      
      message += `\n💳 Выберите способ оплаты:`;

      await bot.editMessageText(
        message,
        {
          chat_id: chatId,
          message_id: messageId,
          ...getPaymentMethodsKeyboard(paymentMethods)
        }
      );
    }

    // Выбор метода оплаты
    else if (data.startsWith('payment_method_')) {
      const methodId = data.replace('payment_method_', '');
      const session = userSessions.get(userId);

      if (!session) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Сессия истекла, начните заново', show_alert: true });
        return;
      }

      const paymentMethods = await getPaymentMethods();
      const selectedMethod = paymentMethods.find(m => m.id === methodId);

      if (!selectedMethod) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Метод оплаты не найден', show_alert: true });
        return;
      }

      // Создаем платеж (связь с продлеваемой подпиской установим при подтверждении)
      const payment = await createPayment({
        crypto: methodId,
        price: session.price,
        currencyCode: session.currencyCode,
        tariffId: session.tariffId,
        tariffName: session.tariffName,
        months: session.months,
        userTelegram: userName,
        userId: userId,
        extendedSubscriptionKey: null
      });

      if (!payment) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка создания платежа', show_alert: true });
        return;
      }

      // Сохраняем платеж в сессии
      session.paymentKey = payment.key;
      session.paymentMethod = methodId;
      userSessions.set(userId, session);

      // Формируем сообщение
      let paymentMessage = `💳 Реквизиты для оплаты:\n\n`;
      paymentMessage += `Метод: ${selectedMethod.name}\n`;
      paymentMessage += `Адрес: \`${selectedMethod.address}\`\n`;
      paymentMessage += `Сумма: ${session.price} ${session.currencyCode}\n\n`;
      paymentMessage += `⏱ Время на оплату: 30 минут\n`;
      paymentMessage += `📝 ID платежа: ${payment.id}\n\n`;
      paymentMessage += `После оплаты нажмите кнопку ниже и прикрепите скриншот чека.`;

      await bot.editMessageText(
        paymentMessage,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          ...getPaymentConfirmationKeyboard(payment.key)
        }
      );
    }

    // Загрузка чека
    else if (data.startsWith('upload_receipt_')) {
      const paymentKey = data.replace('upload_receipt_', '');
      
      // Сохраняем состояние ожидания фото
      const session = userSessions.get(userId) || {};
      session.waitingForReceipt = true;
      session.paymentKey = paymentKey;
      userSessions.set(userId, session);

      await bot.sendMessage(
        chatId,
        '📸 Пожалуйста, отправьте скриншот чека об оплате.'
      );
    }

    // Отмена платежа
    else if (data === 'cancel_payment') {
      userSessions.delete(userId);
      await bot.editMessageText(
        '❌ Платеж отменен.\n\nВернитесь в главное меню.',
        {
          chat_id: chatId,
          message_id: messageId,
          ...getBackToMainKeyboard()
        }
      );
    }

    // Админ - подтверждение платежа
    else if (data.startsWith('admin_confirm_')) {
      const paymentKey = data.replace('admin_confirm_', '');
      const payment = await getPaymentByKey(paymentKey);

      if (!payment) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Платеж не найден', show_alert: true });
        return;
      }

      // Проверяем, есть ли у пользователя активная подписка (status=payed и subscriptionEndDate > now)
      const activeSubscription = await getActiveSubscription(payment.userId);

      if (activeSubscription) {
        // У пользователя уже есть активная подписка - продлеваем ее
        console.log(`🔄 Пользователь ${payment.userId} имеет активную подписку, продлеваем...`);
        
        // Обновляем статус нового платежа
        await updatePaymentStatus(paymentKey, 'payed');
        
        // Сохраняем связь с продлеваемой подпиской
        const { getDatabase } = require('./config/firebase');
        const db = getDatabase();
        await db.ref(`payments/${paymentKey}`).update({
          extendedSubscriptionKey: activeSubscription.key
        });
        
        // Продлеваем существующую подписку
        await extendSubscription(activeSubscription.key, payment.months);
        
        const oldEndDate = new Date(activeSubscription.subscriptionEndDate);
        const newEndDate = new Date(oldEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + payment.months);
        
        // Уведомляем пользователя о продлении
        await bot.sendMessage(
          payment.userId,
          `✅ Ваша подписка успешно продлена!\n\n` +
          `📦 Тариф: ${payment.tariffName}\n` +
          `⏰ Добавлено: ${payment.months} ${getMonthsText(payment.months)}\n` +
          `💰 Сумма: ${payment.price} ${payment.currencyCode || '₽'}\n\n` +
          `📅 Новая дата окончания: ${newEndDate.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}\n\n` +
          `Вы продолжаете оставаться участником канала! 🎉`
        );
        
        // Убираем кнопки из исходного сообщения
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: messageId }
        );
        
        // Уведомляем админа
        await bot.sendMessage(
          chatId,
          `✅ Платеж подтвержден и подписка продлена для @${payment.userTelegram}\n\n` +
          `Добавлено: ${payment.months} ${getMonthsText(payment.months)}\n` +
          `Новая дата окончания: ${newEndDate.toLocaleString('ru-RU')}`
        );
        
        await bot.answerCallbackQuery(query.id, { text: '✅ Подписка продлена', show_alert: false });
        return;
      }

      // Нет активной подписки - создаем новую и выдаем ссылку
      console.log(`📝 Пользователь ${payment.userId} не имеет активной подписки, создаем новую...`);
      
      // Обновляем статус
      await updatePaymentStatus(paymentKey, 'payed');

      // Сохраняем дату окончания подписки
      await saveSubscriptionEndDate(paymentKey, payment.months);

      // Генерируем одноразовую ссылку на канал
      try {
        const channelId = process.env.CHANNEL_ID;
        
        if (!channelId) {
          throw new Error('CHANNEL_ID не указан в .env файле');
        }

        // Время истечения ссылки - 24 часа
        const expireDate = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        
        const inviteLink = await bot.createChatInviteLink(channelId, {
          expire_date: expireDate,
          name: `Подписка ${payment.tariffName}`,
          creates_join_request: false
        });
        
        console.log(`📝 Создана invite ссылка для пользователя ${payment.userId}: ${inviteLink.invite_link}`);

        // Сохраняем ссылку в Firebase и в сессии
        await saveInviteLink(paymentKey, inviteLink.invite_link);
        
        userSessions.set(payment.userId, {
          inviteLink: inviteLink.invite_link,
          paymentKey,
          channelId
        });

        // Устанавливаем таймер для автоматического отзыва ссылки через 30 минут
        setTimeout(async () => {
          try {
            console.log(`⏰ Таймер истек для пользователя ${payment.userId}, проверяем ссылку...`);
            
            // Проверяем, что ссылка все еще активна в Firebase
            const currentPayment = await getPaymentByKey(paymentKey);
            if (currentPayment && currentPayment.inviteLink === inviteLink.invite_link) {
              // Отзываем ссылку
              await bot.revokeChatInviteLink(channelId, inviteLink.invite_link);
              await saveInviteLink(paymentKey, null);
              console.log(`✅ Ссылка автоматически отозвана для пользователя ${payment.userId} по таймауту`);
              
              // Уведомляем пользователя
              await bot.sendMessage(
                payment.userId,
                '⏰ Ваша пригласительная ссылка была автоматически отозвана через 30 минут для безопасности.\n\n' +
                'Если вы уже присоединились к каналу - всё в порядке!\n' +
                'Если нет - свяжитесь с поддержкой.'
              );
            } else {
              console.log(`ℹ️ Ссылка для пользователя ${payment.userId} уже была отозвана ранее`);
            }
          } catch (error) {
            console.error('❌ Ошибка автоматического отзыва ссылки:', error.message);
          }
        }, 30 * 60 * 1000); // 30 минут

        // Отправляем ссылку пользователю
        await bot.sendMessage(
          payment.userId,
          `✅ Ваш платеж подтвержден!\n\n` +
          `📦 Тариф: ${payment.tariffName}\n` +
          `💰 Сумма: ${payment.price} ${payment.currencyCode || '₽'}\n\n` +
          `🔗 Одноразовая ссылка на канал:\n${inviteLink.invite_link}\n\n` +
          `⚠️ ВАЖНО:\n` +
          `• Ссылка автоматически отзовется через 30 минут\n` +
          `• После присоединения используйте команду /joined чтобы подтвердить вход\n`
        );

        // Убираем кнопки из исходного сообщения
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: messageId }
        );
        
        // Уведомляем админа
        await bot.sendMessage(
          chatId,
          `✅ Платеж подтвержден и ссылка отправлена пользователю @${payment.userTelegram}`
        );
      } catch (error) {
        console.error('❌ Ошибка создания invite link:', error.message);
        
        let errorMessage = '❌ Ошибка создания ссылки на канал.\n\n';
        
        if (error.message.includes('chat not found')) {
          errorMessage += 'Канал не найден. Проверьте:\n' +
            '1. CHANNEL_ID правильно указан в .env\n' +
            '2. ID должен начинаться с -100\n' +
            '3. Бот добавлен в канал\n\n' +
            'Используйте /check_channel для диагностики';
        } else if (error.message.includes('not enough rights')) {
          errorMessage += 'У бота недостаточно прав.\n' +
            'Добавьте бота как администратора с правом "Invite users via link"';
        } else {
          errorMessage += error.message;
        }
        
        await bot.sendMessage(chatId, errorMessage);
        await bot.answerCallbackQuery(query.id, { 
          text: '❌ Не удалось создать ссылку', 
          show_alert: true 
        });
      }
    }

    // Админ - отклонение платежа
    else if (data.startsWith('admin_reject_')) {
      const paymentKey = data.replace('admin_reject_', '');
      const payment = await getPaymentByKey(paymentKey);

      if (!payment) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Платеж не найден', show_alert: true });
        return;
      }

      // Обновляем статус
      await updatePaymentStatus(paymentKey, 'rejected');

      // Уведомляем пользователя
      await bot.sendMessage(
        payment.userId,
        `❌ К сожалению, ваш платеж был отклонен.\n\n` +
        `Если вы считаете это ошибкой, пожалуйста, свяжитесь с поддержкой.`
      );

      // Убираем кнопки из исходного сообщения
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: messageId }
      );
      
      // Уведомляем админа
      await bot.sendMessage(
        chatId,
        `❌ Платеж отклонен для пользователя @${payment.userTelegram}`
      );
    }

    // Установка напоминания о доступности тарифа
    else if (data.startsWith('set_reminder_')) {
      const tariffId = data.replace('set_reminder_', '');
      const tariff = await getTariffById(tariffId);

      if (!tariff) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Тариф не найден', show_alert: true });
        return;
      }

      // Проверяем, есть ли уже активное напоминание
      const hasReminder = await hasActiveReminder(userId, tariffId);
      
      if (hasReminder) {
        await bot.answerCallbackQuery(query.id, { 
          text: '✅ У вас уже установлено напоминание об этом тарифе', 
          show_alert: true 
        });
        return;
      }

      // Создаем напоминание
      const reminderDate = getNextReminderDate();
      const success = await createReminder(userId, tariffId, tariff.name, reminderDate);

      if (success) {
        await bot.editMessageText(
          `✅ Отлично! Я напомню вам о доступности тарифа "${tariff.name}"\n\n` +
          `📅 Напоминание будет отправлено: ${formatDateForUser(reminderDate)} по МСК\n\n` +
          `После этого вы сможете приобрести подписку 26 и 27 числа.`,
          {
            chat_id: chatId,
            message_id: messageId,
            ...getBackToMainKeyboard()
          }
        );
        
        await bot.answerCallbackQuery(query.id, { text: '🔔 Напоминание установлено!', show_alert: false });
      } else {
        await bot.answerCallbackQuery(query.id, { 
          text: '❌ Не удалось установить напоминание. Попробуйте позже.', 
          show_alert: true 
        });
      }
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Ошибка обработки callback:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ Произошла ошибка', show_alert: true });
  }
});

// === ОБРАБОТКА ФОТО (ЧЕК) ===

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = userSessions.get(userId);

  if (!session || !session.waitingForReceipt) {
    return;
  }

  const photo = msg.photo[msg.photo.length - 1]; // Берем фото наибольшего размера
  const photoId = photo.file_id;

  // Обновляем платеж
  await updatePaymentStatus(session.paymentKey, 'pending', photoId);

  // Получаем данные платежа
  const payment = await getPaymentByKey(session.paymentKey);

  // Отправляем уведомление админу
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  
  await bot.sendPhoto(adminId, photoId, {
    caption: 
      `🔔 Новый чек на проверку\n\n` +
      `👤 Пользователь: @${payment.userTelegram}\n` +
      `📦 Тариф: ${payment.tariffName}\n` +
      `💰 Сумма: ${payment.price} ${payment.currencyCode || '₽'}\n` +
      `💳 Метод: ${payment.crypto}\n` +
      `📝 ID платежа: ${payment.id}\n` +
      `⏰ Создан: ${new Date(payment.createdAt).toLocaleString('ru-RU')}`,
    ...getAdminConfirmationKeyboard(session.paymentKey)
  });

  // Уведомляем пользователя
  await bot.sendMessage(
    chatId,
    '✅ Чек отправлен на проверку!\n\n' +
    'Ожидайте подтверждения от администратора. Обычно это занимает несколько минут.',
    getBackToMainKeyboard()
  );

  // Очищаем состояние ожидания
  session.waitingForReceipt = false;
  userSessions.set(userId, session);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});
