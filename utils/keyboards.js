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
  const keyboard = tariffs.map(tariff => {
    // Если есть варианты, показываем диапазон цен
    let text = tariff.name;
    
    if (tariff.variants && Object.keys(tariff.variants).length > 0) {
      const prices = Object.values(tariff.variants).map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        text += ` - от ${minPrice}${tariff.currencyCode || '₽'}`;
      } else {
        text += ` - от ${minPrice}${tariff.currencyCode || '₽'}`;
      }
    }
    
    return [{
      text,
      callback_data: `tariff_${tariff.id}`
    }];
  });

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
 * Клавиатура с вариантами подписки
 */
function getVariantsKeyboard(variants, tariffId, currencyCode = '₽') {
  // Находим базовый вариант (1 месяц) - это основа для расчета скидок
  const baseVariant = Object.values(variants).find(v => v.months === 1);
  const basePricePerMonth = baseVariant ? baseVariant.price : 0;

  const keyboard = Object.entries(variants).map(([variantId, variant]) => {
    const { months, price } = variant;
    
    // Рассчитываем цену за месяц для текущего варианта
    const pricePerMonth = price / months;
    
    // Рассчитываем скидку относительно базовой цены (1 месяц)
    // Скидка = ((базовая цена за месяц - текущая цена за месяц) / базовая цена за месяц) * 100
    const discount = basePricePerMonth > 0 ? Math.round(((basePricePerMonth - pricePerMonth) / basePricePerMonth) * 100) : 0;
    
    let text = `${months} ${getMonthsText(months)} - ${price}${currencyCode}`;
    
    if (discount > 0) {
      text += ` (скидка ${discount}%)`;
    }
    
    return [{
      text,
      callback_data: `variant_${tariffId}_${variantId}`
    }];
  });

  keyboard.push([{ text: '◀️ Назад', callback_data: 'select_subscription' }]);

  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
}

/**
 * Получение правильного склонения для месяцев
 */
function getMonthsText(months) {
  if (months === 1) return 'месяц';
  if (months >= 2 && months <= 4) return 'месяца';
  return 'месяцев';
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
  getBackToMainKeyboard,
  getVariantsKeyboard
};
