require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { initializeFirebase } = require('./config/firebase');
const { getActiveTariffs, getTariffById } = require('./services/tariffService');
const { getPaymentMethods, createPayment, updatePaymentStatus, saveInviteLink, getPaymentByKey, getPaymentByUserIdWithInviteLink } = require('./services/paymentService');
const {
  getMainMenuKeyboard,
  getTariffsKeyboard,
  getPaymentMethodsKeyboard,
  getPaymentConfirmationKeyboard,
  getAdminConfirmationKeyboard,
  getBackToMainKeyboard
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

// Запускаем проверку после инициализации
bot.on('ready', () => {
  checkChannelAccess();
});

// === КОМАНДЫ ===

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.username || msg.from.first_name;

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

      // Сохраняем выбранный тариф в сессии
      userSessions.set(userId, {
        tariffId,
        tariffName: tariff.name,
        price: tariff.price,
        currencyCode: tariff.currencyCode || '₽'
      });

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

      await bot.editMessageText(
        `📦 Выбран тариф: ${tariff.name}\n💰 Цена: ${tariff.price}${tariff.currencyCode || '₽'}\n\n💳 Выберите способ оплаты:`,
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

      // Создаем платеж
      const payment = await createPayment({
        crypto: methodId,
        price: session.price,
        currencyCode: session.currencyCode,
        tariffId: session.tariffId,
        tariffName: session.tariffName,
        userTelegram: userName,
        userId: userId
      });

      if (!payment) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка создания платежа', show_alert: true });
        return;
      }

      // Сохраняем платеж в сессии
      session.paymentKey = payment.key;
      session.paymentMethod = methodId;
      userSessions.set(userId, session);

      await bot.editMessageText(
        `💳 Реквизиты для оплаты:\n\n` +
        `Метод: ${selectedMethod.name}\n` +
        `Адрес: \`${selectedMethod.address}\`\n` +
        `Сумма: ${session.price}${session.currencyCode}\n\n` +
        `⏱ Время на оплату: 30 минут\n` +
        `📝 ID платежа: ${payment.id}\n\n` +
        `После оплаты нажмите кнопку ниже и прикрепите скриншот чека.`,
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

      // Обновляем статус
      await updatePaymentStatus(paymentKey, 'payed');

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
          `💰 Сумма: ${payment.price}${payment.currencyCode || '₽'}\n\n` +
          `🔗 Одноразовая ссылка на канал:\n${inviteLink.invite_link}\n\n` +
          `⚠️ ВАЖНО:\n` +
          `• Ссылка автоматически отзовется через 30 минут\n` +
          `• После присоединения используйте команду /joined чтобы подтвердить вход\n`
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

      // Уведомляем админа
      await bot.sendMessage(
        chatId,
        `❌ Платеж отклонен для пользователя @${payment.userTelegram}`
      );
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
      `💰 Сумма: ${payment.price}${payment.currencyCode || '₽'}\n` +
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
