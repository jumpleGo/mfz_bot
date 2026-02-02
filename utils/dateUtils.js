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

module.exports = {
  getMoscowDate,
  formatDateForUser
};
