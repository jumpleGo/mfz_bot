const { getDatabase } = require('../config/firebase');
const { nanoid } = require('nanoid');

/**
 * Получение типов оплаты из Firebase
 */
async function getPaymentMethods() {
  try {
    const db = getDatabase();
    const snapshot = await db.ref('paymentData').once('value');
    const paymentData = snapshot.val();

    if (!paymentData) {
      return [];
    }

    // Фильтруем только bybit_uid и USDT
    const methods = [];
    
    if (paymentData.bybit_uid) {
      methods.push({
        id: 'bybit_uid',
        name: 'Bybit UID',
        address: paymentData.bybit_uid.address
      });
    }
    
    if (paymentData.USDT || paymentData.usdt) {
      const usdtData = paymentData.USDT || paymentData.usdt;
      methods.push({
        id: 'USDT',
        name: 'USDT',
        address: usdtData.address
      });
    }

    return methods;
  } catch (error) {
    console.error('Ошибка получения методов оплаты:', error);
    return [];
  }
}

/**
 * Создание записи платежа
 */
async function createPayment(paymentData) {
  try {
    const db = getDatabase();
    const id = nanoid(8);
    const now = new Date().toISOString();
    
    // Время истечения - 30 минут от создания
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const payment = {
      id,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      crypto: paymentData.crypto,
      price: paymentData.price,
      currencyCode: paymentData.currencyCode,
      tariffId: paymentData.tariffId,
      tariffName: paymentData.tariffName,
      months: paymentData.months,
      userTelegram: paymentData.userTelegram,
      userId: paymentData.userId,
      status: 'pending', // pending -> payed
      receiptPhotoId: null,
      extendedSubscriptionKey: paymentData.extendedSubscriptionKey || null // Ключ подписки, которую продлевает этот платеж
    };

    const newPaymentRef = db.ref('payments').push();
    payment.key = newPaymentRef.key;
    
    await newPaymentRef.set(payment);
    
    return payment;
  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    return null;
  }
}

/**
 * Обновление статуса платежа
 */
async function updatePaymentStatus(paymentKey, status, receiptPhotoId = null) {
  try {
    const db = getDatabase();
    const updates = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (receiptPhotoId) {
      updates.receiptPhotoId = receiptPhotoId;
    }

    await db.ref(`payments/${paymentKey}`).update(updates);
    return true;
  } catch (error) {
    console.error('Ошибка обновления статуса платежа:', error);
    return false;
  }
}

/**
 * Сохранение invite link в платеже
 */
async function saveInviteLink(paymentKey, inviteLink) {
  try {
    const db = getDatabase();
    await db.ref(`payments/${paymentKey}`).update({
      inviteLink,
      inviteLinkCreatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Ошибка сохранения invite link:', error);
    return false;
  }
}

/**
 * Получение платежа по ключу
 */
async function getPaymentByKey(paymentKey) {
  try {
    const db = getDatabase();
    const snapshot = await db.ref(`payments/${paymentKey}`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Ошибка получения платежа:', error);
    return null;
  }
}

/**
 * Получение платежа по userId с активной invite ссылкой
 */
async function getPaymentByUserIdWithInviteLink(userId) {
  try {
    const db = getDatabase();
    const snapshot = await db.ref('payments')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    const payments = snapshot.val();
    if (!payments) return null;
    
    // Ищем платеж со статусом 'payed' и активной invite ссылкой
    for (const [key, payment] of Object.entries(payments)) {
      if (payment.status === 'payed' && payment.inviteLink) {
        return { ...payment, key };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения платежа по userId:', error);
    return null;
  }
}

/**
 * Сохранение даты окончания подписки
 */
async function saveSubscriptionEndDate(paymentKey, months) {
  try {
    const db = getDatabase();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    await db.ref(`payments/${paymentKey}`).update({
      subscriptionEndDate: endDate.toISOString()
    });
    return true;
  } catch (error) {
    console.error('Ошибка сохранения даты окончания подписки:', error);
    return false;
  }
}

/**
 * Получение всех пользователей с истекшей подпиской
 */
async function getExpiredSubscriptions() {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const snapshot = await db.ref('payments')
      .orderByChild('status')
      .equalTo('payed')
      .once('value');
    
    const payments = snapshot.val();
    if (!payments) return [];
    
    const expiredUsers = [];
    
    for (const [key, payment] of Object.entries(payments)) {
      if (payment.subscriptionEndDate && payment.subscriptionEndDate < now) {
        expiredUsers.push({
          ...payment,
          key
        });
      }
    }
    
    return expiredUsers;
  } catch (error) {
    console.error('Ошибка получения истекших подписок:', error);
    return [];
  }
}

/**
 * Получение подписок, которым нужно отправить уведомление
 */
async function getSubscriptionsNeedingNotification() {
  try {
    const db = getDatabase();
    const now = new Date();
    
    const snapshot = await db.ref('payments')
      .orderByChild('status')
      .equalTo('payed')
      .once('value');
    
    const payments = snapshot.val();
    if (!payments) return { twoDays: [], eightHours: [] };
    
    const twoDaysNotifications = [];
    const eightHoursNotifications = [];
    
    for (const [key, payment] of Object.entries(payments)) {
      if (!payment.subscriptionEndDate) continue;
      
      const endDate = new Date(payment.subscriptionEndDate);
      const timeLeft = endDate - now;
      
      // 2 дня = 48 часов = 172800000 миллисекунд
      // 8 часов = 28800000 миллисекунд
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
      const eightHoursMs = 8 * 60 * 60 * 1000;
      
      // Проверяем уведомление за 2 дня
      if (timeLeft <= twoDaysMs && timeLeft > eightHoursMs && !payment.notificationSent2Days) {
        twoDaysNotifications.push({
          ...payment,
          key,
          timeLeft
        });
      }
      
      // Проверяем уведомление за 8 часов
      if (timeLeft <= eightHoursMs && timeLeft > 0 && !payment.notificationSent8Hours) {
        eightHoursNotifications.push({
          ...payment,
          key,
          timeLeft
        });
      }
    }
    
    return { twoDays: twoDaysNotifications, eightHours: eightHoursNotifications };
  } catch (error) {
    console.error('Ошибка получения подписок для уведомлений:', error);
    return { twoDays: [], eightHours: [] };
  }
}

/**
 * Отметка подписки как истекшей
 */
async function markSubscriptionAsExpired(paymentKey) {
  try {
    const db = getDatabase();
    await db.ref(`payments/${paymentKey}`).update({
      status: 'expired',
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Ошибка отметки подписки как истекшей:', error);
    return false;
  }
}

/**
 * Отметка отправленного уведомления
 */
async function markNotificationSent(paymentKey, notificationType) {
  try {
    const db = getDatabase();
    const field = notificationType === '2days' ? 'notificationSent2Days' : 'notificationSent8Hours';
    await db.ref(`payments/${paymentKey}`).update({
      [field]: true,
      [`${field}At`]: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Ошибка отметки отправленного уведомления:', error);
    return false;
  }
}

/**
 * Получение активной подписки пользователя
 */
async function getActiveSubscription(userId) {
  try {
    const db = getDatabase();
    const snapshot = await db.ref('payments')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    const payments = snapshot.val();
    if (!payments) return null;
    
    const now = new Date().toISOString();
    
    // Ищем активную подписку (status = payed и subscriptionEndDate > now)
    for (const [key, payment] of Object.entries(payments)) {
      if (payment.status === 'payed' && payment.subscriptionEndDate && payment.subscriptionEndDate > now) {
        return { ...payment, key };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения активной подписки:', error);
    return null;
  }
}

/**
 * Получение просроченных неоплаченных платежей (старше 1 часа)
 */
async function getExpiredPendingPayments() {
  try {
    const db = getDatabase();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const snapshot = await db.ref('payments')
      .orderByChild('status')
      .equalTo('pending')
      .once('value');
    
    const payments = snapshot.val();
    if (!payments) return [];
    
    const expiredPayments = [];
    
    for (const [key, payment] of Object.entries(payments)) {
      // Проверяем, что платеж создан больше часа назад
      if (payment.createdAt < oneHourAgo) {
        expiredPayments.push({
          ...payment,
          key
        });
      }
    }
    
    return expiredPayments;
  } catch (error) {
    console.error('Ошибка получения просроченных платежей:', error);
    return [];
  }
}

/**
 * Продление существующей подписки
 */
async function extendSubscription(paymentKey, additionalMonths) {
  try {
    const db = getDatabase();
    const payment = await getPaymentByKey(paymentKey);
    
    if (!payment || !payment.subscriptionEndDate) {
      console.error('❌ Не найдена подписка для продления:', paymentKey);
      return false;
    }
    
    const currentEndDate = new Date(payment.subscriptionEndDate);
    const now = new Date();
    
    // Если подписка еще активна, продлеваем от текущей даты окончания
    // Если уже истекла, продлеваем от текущего момента
    const baseDate = currentEndDate > now ? currentEndDate : now;
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);
    
    console.log(`🔄 Продление подписки для пользователя ${payment.userId}:`, {
      paymentKey,
      additionalMonths,
      oldEndDate: currentEndDate.toISOString(),
      newEndDate: newEndDate.toISOString()
    });
    
    await db.ref(`payments/${paymentKey}`).update({
      subscriptionEndDate: newEndDate.toISOString(),
      updatedAt: new Date().toISOString(),
      // Сбрасываем флаги уведомлений для продленной подписки
      notificationSent2Days: false,
      notificationSent8Hours: false
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка продления подписки:', error);
    return false;
  }
}

module.exports = {
  getPaymentMethods,
  createPayment,
  updatePaymentStatus,
  saveInviteLink,
  getPaymentByKey,
  getPaymentByUserIdWithInviteLink,
  saveSubscriptionEndDate,
  getExpiredSubscriptions,
  markSubscriptionAsExpired,
  getSubscriptionsNeedingNotification,
  markNotificationSent,
  getActiveSubscription,
  extendSubscription,
  getExpiredPendingPayments
};
