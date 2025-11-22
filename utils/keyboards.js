/**
 * Главное меню
 */
function getMainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💳 Выбрать подписку', callback_data: 'select_subscription' }],
        [{ text: 'ℹ️ Информация', callback_data: 'info' }]
      ]
    }
  };
}

/**
 * Клавиатура с тарифами
 */
function getTariffsKeyboard(tariffs) {
  const keyboard = tariffs.map(tariff => ([{
    text: `${tariff.name} - ${tariff.price} ${tariff.currencyCode || '₽'}`,
    callback_data: `tariff_${tariff.id}`
  }]));

  keyboard.push([{ text: '◀️ Назад', callback_data: 'back_to_main' }]);

  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
}

/**
 * Клавиатура с методами оплаты
 */
function getPaymentMethodsKeyboard(methods) {
  const keyboard = methods.map(method => ([{
    text: method.name,
    callback_data: `payment_method_${method.id}`
  }]));

  keyboard.push([{ text: '◀️ Назад', callback_data: 'select_subscription' }]);

  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
}

/**
 * Клавиатура подтверждения оплаты
 */
function getPaymentConfirmationKeyboard(paymentKey) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Я оплатил, прикрепить чек', callback_data: `upload_receipt_${paymentKey}` }],
        [{ text: '❌ Отменить', callback_data: 'cancel_payment' }]
      ]
    }
  };
}

/**
 * Клавиатура для админа (подтверждение платежа)
 */
function getAdminConfirmationKeyboard(paymentKey) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Подтвердить', callback_data: `admin_confirm_${paymentKey}` },
          { text: '❌ Отклонить', callback_data: `admin_reject_${paymentKey}` }
        ]
      ]
    }
  };
}

/**
 * Клавиатура возврата в главное меню
 */
function getBackToMainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '◀️ Главное меню', callback_data: 'back_to_main' }]
      ]
    }
  };
}

module.exports = {
  getMainMenuKeyboard,
  getTariffsKeyboard,
  getPaymentMethodsKeyboard,
  getPaymentConfirmationKeyboard,
  getAdminConfirmationKeyboard,
  getBackToMainKeyboard
};
