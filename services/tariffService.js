const { getDatabase } = require('../config/firebase');

/**
 * Получение активных тарифов из Firebase
 */
async function getActiveTariffs() {
  try {
    const db = getDatabase();
    const snapshot = await db.ref('tariffsFotPayment').once('value');
   console.log(snapshot.val())
    const tariffs = snapshot.val();

    if (!tariffs) {
      return [];
    }

    // Фильтруем активные тарифы
    const activeTariffs = Object.entries(tariffs)
      .map(([key, tariff]) => ({
        id: key,
        ...tariff
      }));

    return activeTariffs;
  } catch (error) {
    console.error('Ошибка получения тарифов:', error);
    return [];
  }
}

/**
 * Получение тарифа по ID
 */
async function getTariffById(tariffId) {
  try {
    const db = getDatabase();
    const snapshot = await db.ref(`tariffsFotPayment/${tariffId}`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Ошибка получения тарифа:', error);
    return null;
  }
}

module.exports = {
  getActiveTariffs,
  getTariffById
};
