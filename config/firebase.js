const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
function initializeFirebase() {
  try {
    const config = {
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };

    // Приоритет 1: Отдельные переменные окружения с префиксом NUXT_ (для Docker/production)
    if (process.env.NUXT_FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        type: process.env.NUXT_FIREBASE_TYPE || 'service_account',
        project_id: process.env.NUXT_FIREBASE_PROJECT_ID,
        private_key_id: process.env.NUXT_FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.NUXT_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.NUXT_FIREBASE_CLIENT_EMAIL,
        client_id: process.env.NUXT_FIREBASE_CLIENT_ID,
        auth_uri: process.env.NUXT_FIREBASE_AUTH_URI,
        token_uri: process.env.NUXT_FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.NUXT_FIREBASE_AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.NUXT_FIREBASE_CLIENT_CERT_URL,
        universe_domain: process.env.NUXT_FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
      };
      config.credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase credentials загружены из переменных окружения NUXT_');
    }
    // Приоритет 2: JSON в одной переменной (альтернативный способ)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        config.credential = admin.credential.cert(serviceAccount);
        console.log('✅ Firebase credentials загружены из FIREBASE_SERVICE_ACCOUNT');
      } catch (error) {
        console.error('❌ Ошибка парсинга FIREBASE_SERVICE_ACCOUNT:', error.message);
        throw error;
      }
    }
    // Приоритет 3: Файл service account (для локальной разработки)
    else {
      try {
        const serviceAccount = require('../firebase-service-account.json');
        config.credential = admin.credential.cert(serviceAccount);
        console.log('✅ Firebase credentials загружены из файла');
      } catch (error) {
        console.error('❌ Firebase credentials не найдены');
        console.error('Необходимо установить одно из:');
        console.error('1. Переменные окружения NUXT_FIREBASE_PRIVATE_KEY, NUXT_FIREBASE_CLIENT_EMAIL и т.д.');
        console.error('2. Переменную окружения FIREBASE_SERVICE_ACCOUNT с JSON');
        console.error('3. Файл firebase-service-account.json');
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
