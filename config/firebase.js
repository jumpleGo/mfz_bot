const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
function initializeFirebase() {
  try {
    // Попытка загрузить service account из файла
    let serviceAccount;
    try {
      serviceAccount = require('../firebase-service-account.json');
    } catch (error) {
      console.log('⚠️  firebase-service-account.json не найден, используется дефолтная инициализация');
    }

    const config = {
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };

    if (serviceAccount) {
      config.credential = admin.credential.cert(serviceAccount);
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
