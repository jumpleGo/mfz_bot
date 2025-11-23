const { getDatabase } = require('../config/firebase');

/**
 * Создать напоминание для пользователя
 */
async function createReminder(userId, tariffId, tariffName, reminderDate) {
  try {
    const db = getDatabase();
    const reminderRef = db.ref('reminders').push();
    
    const reminder = {
      userId,
      tariffId,
      tariffName,
      reminderDate: reminderDate.toISOString(),
      createdAt: new Date().toISOString(),
      sent: false
    };
    
    await reminderRef.set(reminder);
    console.log(`📅 Создано напоминание для пользователя ${userId} о тарифе ${tariffName}`);
    
    return true;
  } catch (error) {
    console.error('Ошибка создания напоминания:', error);
    return false;
  }
}

/**
 * Получить напоминания, которые нужно отправить
 */
async function getRemindersToSend() {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const snapshot = await db.ref('reminders')
      .orderByChild('sent')
      .equalTo(false)
      .once('value');
    
    const reminders = snapshot.val();
    if (!reminders) return [];
    
    // Фильтруем те, у которых время напоминания уже наступило
    const remindersToSend = [];
    for (const [key, reminder] of Object.entries(reminders)) {
      if (reminder.reminderDate <= now) {
        remindersToSend.push({ ...reminder, key });
      }
    }
    
    return remindersToSend;
  } catch (error) {
    console.error('Ошибка получения напоминаний:', error);
    return [];
  }
}

/**
 * Отметить напоминание как отправленное
 */
async function markReminderAsSent(reminderKey) {
  try {
    const db = getDatabase();
    await db.ref(`reminders/${reminderKey}`).update({
      sent: true,
      sentAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка обновления напоминания:', error);
    return false;
  }
}

/**
 * Проверить, есть ли уже напоминание для пользователя о данном тарифе
 */
async function hasActiveReminder(userId, tariffId) {
  try {
    const db = getDatabase();
    const snapshot = await db.ref('reminders')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    const reminders = snapshot.val();
    if (!reminders) return false;
    
    // Проверяем, есть ли неотправленное напоминание о данном тарифе
    for (const reminder of Object.values(reminders)) {
      if (reminder.tariffId === tariffId && !reminder.sent) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка проверки напоминаний:', error);
    return false;
  }
}

module.exports = {
  createReminder,
  getRemindersToSend,
  markReminderAsSent,
  hasActiveReminder
};
