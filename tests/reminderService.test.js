const {
  createReminder,
  getRemindersToSend,
  markReminderAsSent,
  hasActiveReminder
} = require('../services/reminderService');
const { getDatabase } = require('../config/firebase');

// Мокаем Firebase
jest.mock('../config/firebase');

describe('reminderService', () => {
  let mockDatabase;
  let mockRef;

  beforeEach(() => {
    // Создаем мок базы данных
    mockRef = {
      push: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue(true),
      once: jest.fn(),
      orderByChild: jest.fn().mockReturnThis(),
      equalTo: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(true)
    };

    mockDatabase = {
      ref: jest.fn().mockReturnValue(mockRef)
    };

    getDatabase.mockReturnValue(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReminder', () => {
    it('должен создавать новое напоминание в базе данных', async () => {
      const userId = 123456;
      const tariffId = 'altsWatcher';
      const tariffName = 'AltSeason Watcher';
      const reminderDate = new Date('2025-12-25T18:00:00+03:00');

      mockRef.push.mockReturnValue({
        key: 'reminder_key_123',
        set: mockRef.set
      });

      const result = await createReminder(userId, tariffId, tariffName, reminderDate);

      expect(result).toBe(true);
      expect(mockDatabase.ref).toHaveBeenCalledWith('reminders');
      expect(mockRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          tariffId,
          tariffName,
          reminderDate: reminderDate.toISOString(),
          sent: false
        })
      );
    });

    it('должен возвращать false при ошибке', async () => {
      mockRef.set.mockRejectedValue(new Error('Database error'));

      const result = await createReminder(123, 'test', 'Test Tariff', new Date());

      expect(result).toBe(false);
    });

    it('должен сохранять дату создания напоминания', async () => {
      const userId = 123456;
      const tariffId = 'altsWatcher';
      const tariffName = 'AltSeason Watcher';
      const reminderDate = new Date('2025-12-25T18:00:00+03:00');

      await createReminder(userId, tariffId, tariffName, reminderDate);

      expect(mockRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(String)
        })
      );
    });
  });

  describe('getRemindersToSend', () => {
    it('должен возвращать только неотправленные напоминания с наступившим временем', async () => {
      const now = new Date('2025-12-25T18:30:00+03:00');
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      const mockReminders = {
        'reminder1': {
          userId: 111,
          tariffId: 'altsWatcher',
          tariffName: 'Test',
          reminderDate: '2025-12-25T18:00:00.000Z', // Уже наступило
          sent: false
        },
        'reminder2': {
          userId: 222,
          tariffId: 'altsWatcher',
          tariffName: 'Test',
          reminderDate: '2025-12-26T18:00:00.000Z', // Еще не наступило
          sent: false
        },
        'reminder3': {
          userId: 333,
          tariffId: 'altsWatcher',
          tariffName: 'Test',
          reminderDate: '2025-12-25T17:00:00.000Z', // Уже отправлено
          sent: true
        }
      };

      mockRef.once.mockResolvedValue({
        val: () => mockReminders
      });

      const reminders = await getRemindersToSend();

      expect(reminders).toHaveLength(1);
      expect(reminders[0].userId).toBe(111);
      expect(reminders[0].key).toBe('reminder1');

      jest.restoreAllMocks();
    });

    it('должен возвращать пустой массив, если напоминаний нет', async () => {
      mockRef.once.mockResolvedValue({
        val: () => null
      });

      const reminders = await getRemindersToSend();

      expect(reminders).toEqual([]);
    });

    it('должен возвращать пустой массив при ошибке', async () => {
      mockRef.once.mockRejectedValue(new Error('Database error'));

      const reminders = await getRemindersToSend();

      expect(reminders).toEqual([]);
    });

    it('должен фильтровать по полю sent=false', async () => {
      await getRemindersToSend();

      expect(mockRef.orderByChild).toHaveBeenCalledWith('sent');
      expect(mockRef.equalTo).toHaveBeenCalledWith(false);
    });
  });

  describe('markReminderAsSent', () => {
    it('должен отмечать напоминание как отправленное', async () => {
      const reminderKey = 'reminder_123';

      const result = await markReminderAsSent(reminderKey);

      expect(result).toBe(true);
      expect(mockDatabase.ref).toHaveBeenCalledWith(`reminders/${reminderKey}`);
      expect(mockRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sent: true,
          sentAt: expect.any(String)
        })
      );
    });

    it('должен возвращать false при ошибке', async () => {
      mockRef.update.mockRejectedValue(new Error('Database error'));

      const result = await markReminderAsSent('test_key');

      expect(result).toBe(false);
    });

    it('должен сохранять время отправки', async () => {
      const reminderKey = 'reminder_123';

      await markReminderAsSent(reminderKey);

      const updateCall = mockRef.update.mock.calls[0][0];
      expect(updateCall.sentAt).toBeDefined();
      expect(new Date(updateCall.sentAt)).toBeInstanceOf(Date);
    });
  });

  describe('hasActiveReminder', () => {
    it('должен возвращать true, если есть неотправленное напоминание о тарифе', async () => {
      const userId = 123456;
      const tariffId = 'altsWatcher';

      const mockReminders = {
        'reminder1': {
          userId: 123456,
          tariffId: 'altsWatcher',
          sent: false
        },
        'reminder2': {
          userId: 123456,
          tariffId: 'otherTariff',
          sent: false
        }
      };

      mockRef.once.mockResolvedValue({
        val: () => mockReminders
      });

      const result = await hasActiveReminder(userId, tariffId);

      expect(result).toBe(true);
      expect(mockRef.orderByChild).toHaveBeenCalledWith('userId');
      expect(mockRef.equalTo).toHaveBeenCalledWith(userId);
    });

    it('должен возвращать false, если напоминание уже отправлено', async () => {
      const userId = 123456;
      const tariffId = 'altsWatcher';

      const mockReminders = {
        'reminder1': {
          userId: 123456,
          tariffId: 'altsWatcher',
          sent: true // Уже отправлено
        }
      };

      mockRef.once.mockResolvedValue({
        val: () => mockReminders
      });

      const result = await hasActiveReminder(userId, tariffId);

      expect(result).toBe(false);
    });

    it('должен возвращать false, если напоминаний нет', async () => {
      mockRef.once.mockResolvedValue({
        val: () => null
      });

      const result = await hasActiveReminder(123, 'test');

      expect(result).toBe(false);
    });

    it('должен возвращать false при ошибке', async () => {
      mockRef.once.mockRejectedValue(new Error('Database error'));

      const result = await hasActiveReminder(123, 'test');

      expect(result).toBe(false);
    });

    it('должен проверять только напоминания конкретного пользователя', async () => {
      const userId = 123456;
      const tariffId = 'altsWatcher';

      const mockReminders = {
        'reminder1': {
          userId: 999999, // Другой пользователь
          tariffId: 'altsWatcher',
          sent: false
        }
      };

      mockRef.once.mockResolvedValue({
        val: () => mockReminders
      });

      const result = await hasActiveReminder(userId, tariffId);

      expect(result).toBe(false);
    });

    it('должен проверять только напоминания о конкретном тарифе', async () => {
      const userId = 123456;
      const tariffId = 'altsWatcher';

      const mockReminders = {
        'reminder1': {
          userId: 123456,
          tariffId: 'otherTariff', // Другой тариф
          sent: false
        }
      };

      mockRef.once.mockResolvedValue({
        val: () => mockReminders
      });

      const result = await hasActiveReminder(userId, tariffId);

      expect(result).toBe(false);
    });
  });
});
