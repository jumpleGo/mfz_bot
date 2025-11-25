const { getDatabase } = require('../config/firebase');

/**
 * Сохранение/обновление пользователя в базе данных
 */
async function saveUser(userData) {
  try {
    const db = getDatabase();
    const userId = userData.id.toString();
    
    const userRecord = {
      userId: userData.id,
      username: userData.username || null,
      firstName: userData.first_name || null,
      lastName: userData.last_name || null,
      languageCode: userData.language_code || null,
      isBot: userData.is_bot || false,
      lastInteraction: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Проверяем, существует ли пользователь
    const snapshot = await db.ref(`bot_users/${userId}`).once('value');
    
    if (snapshot.exists()) {
      // Обновляем существующего пользователя
      await db.ref(`bot_users/${userId}`).update(userRecord);
      console.log(`✅ Пользователь ${userId} обновлен в базе`);
    } else {
      // Создаем нового пользователя
      userRecord.createdAt = new Date().toISOString();
      await db.ref(`bot_users/${userId}`).set(userRecord);
      console.log(`✅ Новый пользователь ${userId} добавлен в базу`);
    }

    return true;
  } catch (error) {
    console.error('Ошибка сохранения пользователя:', error);
    return false;
  }
}

/**
 * Получение пользователя по ID
 */
async function getUserById(userId) {
  try {
    const db = getDatabase();
    const snapshot = await db.ref(`bot_users/${userId}`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

/**
 * Получение всех пользователей
 */
async function getAllUsers() {
  try {
    const db = getDatabase();
    const snapshot = await db.ref('bot_users').once('value');
    const users = snapshot.val();

    if (!users) {
      return [];
    }

    return Object.values(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return [];
  }
}

module.exports = {
  saveUser,
  getUserById,
  getAllUsers
};
