/**
 * Интеграционные тесты для проверки логики доступности тарифа altsWatcher
 */

const {
  isAltsWatcherAvailable,
  isCloseToOpening,
  getTimeUntilOpening,
  getNextAltsWatcherDate,
  getNextReminderDate
} = require('../utils/dateUtils');

describe('Интеграционные тесты: Доступность тарифа altsWatcher', () => {

  describe('Сценарий 1: Попытка покупки 20 декабря (до периода доступности)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-20T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('не должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(false);
    });

    it('следующая дата доступности должна быть 26 декабря', () => {
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getDate()).toBe(26);
      expect(nextDate.getMonth()).toBe(11); // Декабрь
    });

    it('дата напоминания должна быть 25 декабря 18:00', () => {
      const reminderDate = getNextReminderDate();
      expect(reminderDate.getDate()).toBe(25);
      expect(reminderDate.getHours()).toBe(18);
      expect(reminderDate.getMinutes()).toBe(0);
    });
  });

  describe('Сценарий 2: Попытка покупки 25 декабря 15:00 (до 18:00)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-25T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('не должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(false);
    });

    it('должна предлагаться возможность установить напоминание', () => {
      // Напоминание должно быть на сегодня 18:00
      const reminderDate = getNextReminderDate();
      expect(reminderDate.getDate()).toBe(25);
      expect(reminderDate.getHours()).toBe(18);
    });
  });

  describe('Сценарий 3: Попытка покупки 25 декабря 20:00 (после 18:00)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-25T20:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(true);
    });

    it('должен показывать обратный отсчет: 4 часа 0 минут', () => {
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBe(4);
      expect(timeLeft.minutes).toBe(0);
    });

    it('НЕ должна предлагаться возможность установить напоминание', () => {
      // В этом случае показываем обратный отсчет, а не предложение напоминания
      expect(isCloseToOpening()).toBe(true);
    });
  });

  describe('Сценарий 4: Попытка покупки 25 декабря 22:30', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-25T22:30:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(true);
    });

    it('должен показывать обратный отсчет: 1 час 30 минут', () => {
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBe(1);
      expect(timeLeft.minutes).toBe(30);
    });
  });

  describe('Сценарий 5: Попытка покупки 25 декабря 23:45', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-25T23:45:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(true);
    });

    it('должен показывать обратный отсчет: 0 часов 15 минут', () => {
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBe(0);
      expect(timeLeft.minutes).toBe(15);
    });
  });

  describe('Сценарий 6: Покупка 26 декабря 10:00 (период доступности)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-26T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть ДОСТУПЕН', () => {
      expect(isAltsWatcherAvailable()).toBe(true);
    });

    it('не должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(false);
    });

    it('пользователь должен иметь возможность выбрать вариант подписки', () => {
      // Тариф доступен - показываем варианты подписки
      expect(isAltsWatcherAvailable()).toBe(true);
    });
  });

  describe('Сценарий 7: Покупка 27 декабря 23:00 (последний день доступности)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-27T23:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть ДОСТУПЕН', () => {
      expect(isAltsWatcherAvailable()).toBe(true);
    });

    it('не должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(false);
    });
  });

  describe('Сценарий 8: Попытка покупки 28 декабря (после периода доступности)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-28T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('не должно быть близко к открытию', () => {
      expect(isCloseToOpening()).toBe(false);
    });

    it('следующая дата доступности должна быть 26 января', () => {
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getDate()).toBe(26);
      expect(nextDate.getMonth()).toBe(0); // Январь следующего года
    });

    it('дата напоминания должна быть 25 января 18:00', () => {
      const reminderDate = getNextReminderDate();
      expect(reminderDate.getDate()).toBe(25);
      expect(reminderDate.getMonth()).toBe(0); // Январь
      expect(reminderDate.getHours()).toBe(18);
    });
  });

  describe('Сценарий 9: Переход месяца (31 декабря)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-31T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });

    it('следующая дата должна быть в январе следующего года', () => {
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getDate()).toBe(26);
      expect(nextDate.getMonth()).toBe(0); // Январь
      expect(nextDate.getFullYear()).toBe(2026);
    });
  });

  describe('Сценарий 10: Граничный случай - ровно 26 число 00:00', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-26T00:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть ДОСТУПЕН', () => {
      expect(isAltsWatcherAvailable()).toBe(true);
    });
  });

  describe('Сценарий 11: Граничный случай - ровно 27 число 23:59', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-27T23:59:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть ДОСТУПЕН', () => {
      expect(isAltsWatcherAvailable()).toBe(true);
    });
  });

  describe('Сценарий 12: Граничный случай - 28 число 00:00', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-12-28T00:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('тариф должен быть недоступен', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });
  });

  describe('Сценарий 13: Февраль (короткий месяц)', () => {
    beforeEach(() => {
      const mockDate = new Date('2025-02-20T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('следующая дата должна быть 26 февраля', () => {
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getDate()).toBe(26);
      expect(nextDate.getMonth()).toBe(1); // Февраль
    });

    it('тариф должен работать корректно в коротком месяце', () => {
      expect(isAltsWatcherAvailable()).toBe(false);
    });
  });
});
