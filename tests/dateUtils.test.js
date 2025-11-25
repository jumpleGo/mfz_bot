const {
  getMoscowDate,
  isAltsWatcherAvailable,
  getNextAltsWatcherDate,
  getNextReminderDate,
  formatDateForUser,
  isCloseToOpening,
  getTimeUntilOpening
} = require('../utils/dateUtils');

describe('dateUtils', () => {
  
  describe('getMoscowDate', () => {
    it('должен возвращать дату в московском времени', () => {
      const moscowDate = getMoscowDate();
      expect(moscowDate).toBeInstanceOf(Date);
    });
  });

  describe('isAltsWatcherAvailable', () => {
    it('должен возвращать true для 26 числа', () => {
      // Мокаем текущую дату как 26 число
      const mockDate = new Date('2025-12-26T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isAltsWatcherAvailable();
      expect(result).toBe(true);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать true для 27 числа', () => {
      const mockDate = new Date('2025-12-27T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isAltsWatcherAvailable();
      expect(result).toBe(true);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать false для 25 числа', () => {
      const mockDate = new Date('2025-12-25T20:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isAltsWatcherAvailable();
      expect(result).toBe(false);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать false для 28 числа', () => {
      const mockDate = new Date('2025-12-28T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isAltsWatcherAvailable();
      expect(result).toBe(false);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать false для 1 числа', () => {
      const mockDate = new Date('2025-12-01T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isAltsWatcherAvailable();
      expect(result).toBe(false);
      
      jest.restoreAllMocks();
    });
  });

  describe('getNextAltsWatcherDate', () => {
    it('должен возвращать 26 число текущего месяца, если сегодня до 26 числа', () => {
      const mockDate = new Date('2025-12-20T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getDate()).toBe(26);
      expect(nextDate.getMonth()).toBe(11); // Декабрь (0-indexed)
      
      jest.restoreAllMocks();
    });

    it('должен возвращать 26 число следующего месяца, если сегодня после 26 числа', () => {
      const mockDate = new Date('2025-12-28T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getDate()).toBe(26);
      expect(nextDate.getMonth()).toBe(0); // Январь следующего года
      
      jest.restoreAllMocks();
    });

    it('должен возвращать корректное время начала доступности (00:00)', () => {
      const mockDate = new Date('2025-12-20T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const nextDate = getNextAltsWatcherDate();
      expect(nextDate.getHours()).toBe(0);
      expect(nextDate.getMinutes()).toBe(0);
      expect(nextDate.getSeconds()).toBe(0);
      
      jest.restoreAllMocks();
    });
  });

  describe('getNextReminderDate', () => {
    it('должен возвращать 25 число 18:00 текущего месяца, если сегодня до этого времени', () => {
      const mockDate = new Date('2025-12-20T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const reminderDate = getNextReminderDate();
      expect(reminderDate.getDate()).toBe(25);
      expect(reminderDate.getHours()).toBe(18);
      expect(reminderDate.getMinutes()).toBe(0);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать 25 число следующего месяца, если уже прошло 25 число 18:00', () => {
      const mockDate = new Date('2025-12-25T19:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const reminderDate = getNextReminderDate();
      expect(reminderDate.getDate()).toBe(25);
      expect(reminderDate.getMonth()).toBe(0); // Январь следующего года
      
      jest.restoreAllMocks();
    });

    it('должен возвращать текущее 25 число, если сегодня 25 число до 18:00', () => {
      const mockDate = new Date('2025-12-25T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const reminderDate = getNextReminderDate();
      expect(reminderDate.getDate()).toBe(25);
      expect(reminderDate.getMonth()).toBe(11); // Декабрь
      
      jest.restoreAllMocks();
    });
  });

  describe('isCloseToOpening', () => {
    it('должен возвращать true для 25 числа после 18:00', () => {
      const mockDate = new Date('2025-12-25T20:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isCloseToOpening();
      expect(result).toBe(true);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать true для 25 числа в 18:00', () => {
      const mockDate = new Date('2025-12-25T18:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isCloseToOpening();
      expect(result).toBe(true);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать false для 25 числа до 18:00', () => {
      const mockDate = new Date('2025-12-25T15:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isCloseToOpening();
      expect(result).toBe(false);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать false для 24 числа', () => {
      const mockDate = new Date('2025-12-24T20:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isCloseToOpening();
      expect(result).toBe(false);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать false для 26 числа', () => {
      const mockDate = new Date('2025-12-26T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const result = isCloseToOpening();
      expect(result).toBe(false);
      
      jest.restoreAllMocks();
    });
  });

  describe('getTimeUntilOpening', () => {
    it('должен корректно рассчитывать время до открытия с 25 числа 20:00', () => {
      const mockDate = new Date('2025-12-25T20:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBe(4);
      expect(timeLeft.minutes).toBe(0);
      
      jest.restoreAllMocks();
    });

    it('должен корректно рассчитывать время до открытия с 25 числа 22:30', () => {
      const mockDate = new Date('2025-12-25T22:30:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBe(1);
      expect(timeLeft.minutes).toBe(30);
      
      jest.restoreAllMocks();
    });

    it('должен корректно рассчитывать время до открытия с 25 числа 23:45', () => {
      const mockDate = new Date('2025-12-25T23:45:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBe(0);
      expect(timeLeft.minutes).toBe(15);
      
      jest.restoreAllMocks();
    });

    it('должен возвращать время до следующего месяца, если уже 28 число', () => {
      const mockDate = new Date('2025-12-28T10:00:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const timeLeft = getTimeUntilOpening();
      expect(timeLeft.hours).toBeGreaterThan(24);
      
      jest.restoreAllMocks();
    });
  });

  describe('formatDateForUser', () => {
    it('должен форматировать дату в читаемый вид', () => {
      const testDate = new Date('2025-12-26T18:30:00+03:00');
      const formatted = formatDateForUser(testDate);
      
      expect(formatted).toContain('26');
      expect(formatted).toContain('18');
      expect(formatted).toContain('30');
    });

    it('должен использовать русскую локаль', () => {
      const testDate = new Date('2025-12-26T18:30:00+03:00');
      const formatted = formatDateForUser(testDate);
      
      // Проверяем, что название месяца на русском
      expect(formatted).toMatch(/января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря/);
    });
  });
});
