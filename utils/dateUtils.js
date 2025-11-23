/**
 * Утилиты для работы с датами и временными зонами
 */

/**
 * Получить текущую дату в московском времени (UTC+3)
 */
function getMoscowDate() {
  const now = new Date();
  // Конвертируем в московское время (UTC+3)
  const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  return moscowTime;
}

/**
 * Проверить, доступна ли покупка тарифа altsWatcher
 * Доступно только 26 и 27 числа каждого месяца (с 26 00:00 по 27 23:59 по МСК)
 */
function isAltsWatcherAvailable() {
  const moscowDate = getMoscowDate();
  const day = moscowDate.getDate();
  
  return day === 26 || day === 27;
}

/**
 * Получить дату следующего 26 числа
 */
function getNextAltsWatcherDate() {
  const moscowDate = getMoscowDate();
  const currentDay = moscowDate.getDate();
  const currentMonth = moscowDate.getMonth();
  const currentYear = moscowDate.getFullYear();
  
  let targetDate;
  
  if (currentDay < 26) {
    // Если еще не 26 число этого месяца
    targetDate = new Date(currentYear, currentMonth, 26, 0, 0, 0);
  } else {
    // Если уже прошло 26 число, берем следующий месяц
    targetDate = new Date(currentYear, currentMonth + 1, 26, 0, 0, 0);
  }
  
  return targetDate;
}

/**
 * Получить дату для отправки напоминания (25 число в 18:00 МСК)
 */
function getNextReminderDate() {
  const moscowDate = getMoscowDate();
  const currentDay = moscowDate.getDate();
  const currentMonth = moscowDate.getMonth();
  const currentYear = moscowDate.getFullYear();
  
  let reminderDate;
  
  if (currentDay < 25 || (currentDay === 25 && moscowDate.getHours() < 18)) {
    // Если еще не 25 число 18:00 этого месяца
    reminderDate = new Date(currentYear, currentMonth, 25, 18, 0, 0);
  } else {
    // Если уже прошло, берем следующий месяц
    reminderDate = new Date(currentYear, currentMonth + 1, 25, 18, 0, 0);
  }
  
  return reminderDate;
}

/**
 * Форматировать дату для отображения пользователю
 */
function formatDateForUser(date) {
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Проверить, близка ли дата открытия (25 число после 18:00)
 */
function isCloseToOpening() {
  const moscowDate = getMoscowDate();
  const day = moscowDate.getDate();
  const hours = moscowDate.getHours();
  
  // Возвращаем true, если сейчас 25 число и время после 18:00
  return day === 25 && hours >= 18;
}

/**
 * Получить время до начала доступности (до 26 числа 00:00)
 */
function getTimeUntilOpening() {
  const moscowDate = getMoscowDate();
  const currentMonth = moscowDate.getMonth();
  const currentYear = moscowDate.getFullYear();
  
  // Дата начала доступности - 26 число 00:00
  const openingDate = new Date(currentYear, currentMonth, 26, 0, 0, 0);
  
  // Если уже прошло 26 число этого месяца, берем следующий месяц
  if (moscowDate >= openingDate) {
    openingDate.setMonth(openingDate.getMonth() + 1);
  }
  
  const diffMs = openingDate - moscowDate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours: diffHours, minutes: diffMinutes };
}

module.exports = {
  getMoscowDate,
  isAltsWatcherAvailable,
  getNextAltsWatcherDate,
  getNextReminderDate,
  formatDateForUser,
  isCloseToOpening,
  getTimeUntilOpening
};
