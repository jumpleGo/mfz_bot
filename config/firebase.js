const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
function initializeFirebase() {
  try {
    const config = {
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };

    // Приоритет 1: Переменные окружения (для Docker/production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        config.credential = admin.credential.cert(serviceAccount);
        console.log('✅ Firebase credentials загружены из переменной окружения');
      } catch (error) {
        console.error('❌ Ошибка парсинга FIREBASE_SERVICE_ACCOUNT:', error.message);
        throw error;
      }
    }
    // Приоритет 2: Файл service account (для локальной разработки)
    else {
      try {
        const serviceAccount = require('../firebase-service-account.json');
        config.credential = admin.credential.cert(serviceAccount);
        console.log('✅ Firebase credentials загружены из файла');
      } catch (error) {
        console.error('❌ firebase-service-account.json не найден и FIREBASE_SERVICE_ACCOUNT не установлена');
        console.error('Необходимо либо:');
        console.error('1. Создать файл firebase-service-account.json');
        console.error('2. Установить переменную окружения FIREBASE_SERVICE_ACCOUNT');
        throw error;
      }
    }

    admin.initializeApp(config);
    console.log('✅ Firebase инициализирован');
  } catch (error) {
    console.error('❌ Ошибка инициализации Firebase:', error);
    process.exit(1);
  }
}

// Получение ссылки на базу данных
function getDatabase() {
  return admin.database();
}

module.exports = {
  initializeFirebase,
  getDatabase,
  admin
};
