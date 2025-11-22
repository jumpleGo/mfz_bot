// initFirebaseCredentials.js
const fs = require('fs');
const path = require('path');

const CREDENTIALS_ENV = 'FIREBASE_SERVICE_ACCOUNT_JSON';
const targetPath = path.join(__dirname, 'firebase-service-account.json');

function ensureFirebaseCredentialsFile() {
    const jsonFromEnv = process.env[CREDENTIALS_ENV];

    if (!jsonFromEnv) {
        throw new Error(
            `Env-переменная ${CREDENTIALS_ENV} не задана. ` +
            `Передай туда JSON с ключом сервисного аккаунта Firebase.`
        );
    }

    // Если файла ещё нет — создаём. Если хочешь всегда перезаписывать — убери проверку existsSync
    if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, jsonFromEnv, {
            encoding: 'utf8',
            mode: 0o600, // права только для владельца (немного больше безопасности)
        });
        console.log('[firebase] credentials file created at', targetPath);
    }

    return targetPath;
}

module.exports = { ensureFirebaseCredentialsFile };
