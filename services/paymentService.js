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
      userTelegram: paymentData.userTelegram,
      userId: paymentData.userId,
      status: 'pending', // pending -> payed
      receiptPhotoId: null
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

module.exports = {
  getPaymentMethods,
  createPayment,
  updatePaymentStatus,
  saveInviteLink,
  getPaymentByKey,
  getPaymentByUserIdWithInviteLink
};
