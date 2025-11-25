/**
 * Тесты для вспомогательных функций склонения слов
 * Эти функции находятся в bot.js и используются для правильного склонения
 * русских слов в зависимости от числительного
 */

// Копируем функции из bot.js для тестирования
function getMonthsText(months) {
  if (months === 1) return 'месяц';
  if (months >= 2 && months <= 4) return 'месяца';
  return 'месяцев';
}

function getHoursText(hours) {
  if (hours === 1 || hours === 21) return 'час';
  if ((hours >= 2 && hours <= 4) || (hours >= 22 && hours <= 24)) return 'часа';
  return 'часов';
}

function getMinutesText(minutes) {
  if (minutes === 1 || minutes === 21 || minutes === 31 || minutes === 41 || minutes === 51) return 'минута';
  if ((minutes >= 2 && minutes <= 4) || (minutes >= 22 && minutes <= 24) || (minutes >= 32 && minutes <= 34) || (minutes >= 42 && minutes <= 44) || (minutes >= 52 && minutes <= 54)) return 'минуты';
  return 'минут';
}

describe('Вспомогательные функции склонения', () => {

  describe('getMonthsText', () => {
    it('должен возвращать "месяц" для 1', () => {
      expect(getMonthsText(1)).toBe('месяц');
    });

    it('должен возвращать "месяца" для 2', () => {
      expect(getMonthsText(2)).toBe('месяца');
    });

    it('должен возвращать "месяца" для 3', () => {
      expect(getMonthsText(3)).toBe('месяца');
    });

    it('должен возвращать "месяца" для 4', () => {
      expect(getMonthsText(4)).toBe('месяца');
    });

    it('должен возвращать "месяцев" для 5', () => {
      expect(getMonthsText(5)).toBe('месяцев');
    });

    it('должен возвращать "месяцев" для 6', () => {
      expect(getMonthsText(6)).toBe('месяцев');
    });

    it('должен возвращать "месяцев" для 10', () => {
      expect(getMonthsText(10)).toBe('месяцев');
    });

    it('должен возвращать "месяцев" для 12', () => {
      expect(getMonthsText(12)).toBe('месяцев');
    });
  });

  describe('getHoursText', () => {
    it('должен возвращать "час" для 1', () => {
      expect(getHoursText(1)).toBe('час');
    });

    it('должен возвращать "часа" для 2', () => {
      expect(getHoursText(2)).toBe('часа');
    });

    it('должен возвращать "часа" для 3', () => {
      expect(getHoursText(3)).toBe('часа');
    });

    it('должен возвращать "часа" для 4', () => {
      expect(getHoursText(4)).toBe('часа');
    });

    it('должен возвращать "часов" для 5', () => {
      expect(getHoursText(5)).toBe('часов');
    });

    it('должен возвращать "часов" для 10', () => {
      expect(getHoursText(10)).toBe('часов');
    });

    it('должен возвращать "часов" для 11', () => {
      expect(getHoursText(11)).toBe('часов');
    });

    it('должен возвращать "часов" для 20', () => {
      expect(getHoursText(20)).toBe('часов');
    });

    it('должен возвращать "час" для 21', () => {
      expect(getHoursText(21)).toBe('час');
    });

    it('должен возвращать "часа" для 22', () => {
      expect(getHoursText(22)).toBe('часа');
    });

    it('должен возвращать "часа" для 23', () => {
      expect(getHoursText(23)).toBe('часа');
    });

    it('должен возвращать "часа" для 24', () => {
      expect(getHoursText(24)).toBe('часа');
    });
  });

  describe('getMinutesText', () => {
    it('должен возвращать "минута" для 1', () => {
      expect(getMinutesText(1)).toBe('минута');
    });

    it('должен возвращать "минуты" для 2', () => {
      expect(getMinutesText(2)).toBe('минуты');
    });

    it('должен возвращать "минуты" для 3', () => {
      expect(getMinutesText(3)).toBe('минуты');
    });

    it('должен возвращать "минуты" для 4', () => {
      expect(getMinutesText(4)).toBe('минуты');
    });

    it('должен возвращать "минут" для 5', () => {
      expect(getMinutesText(5)).toBe('минут');
    });

    it('должен возвращать "минут" для 10', () => {
      expect(getMinutesText(10)).toBe('минут');
    });

    it('должен возвращать "минут" для 15', () => {
      expect(getMinutesText(15)).toBe('минут');
    });

    it('должен возвращать "минут" для 20', () => {
      expect(getMinutesText(20)).toBe('минут');
    });

    it('должен возвращать "минута" для 21', () => {
      expect(getMinutesText(21)).toBe('минута');
    });

    it('должен возвращать "минуты" для 22', () => {
      expect(getMinutesText(22)).toBe('минуты');
    });

    it('должен возвращать "минуты" для 23', () => {
      expect(getMinutesText(23)).toBe('минуты');
    });

    it('должен возвращать "минуты" для 24', () => {
      expect(getMinutesText(24)).toBe('минуты');
    });

    it('должен возвращать "минут" для 25', () => {
      expect(getMinutesText(25)).toBe('минут');
    });

    it('должен возвращать "минут" для 30', () => {
      expect(getMinutesText(30)).toBe('минут');
    });

    it('должен возвращать "минута" для 31', () => {
      expect(getMinutesText(31)).toBe('минута');
    });

    it('должен возвращать "минуты" для 32', () => {
      expect(getMinutesText(32)).toBe('минуты');
    });

    it('должен возвращать "минуты" для 34', () => {
      expect(getMinutesText(34)).toBе('минуты');
    });

    it('должен возвращать "минут" для 35', () => {
      expect(getMinutesText(35)).toBe('минут');
    });

    it('должен возвращать "минута" для 41', () => {
      expect(getMinutesText(41)).toBe('минута');
    });

    it('должен возвращать "минуты" для 42', () => {
      expect(getMinutesText(42)).toBe('минуты');
    });

    it('должен возвращать "минут" для 45', () => {
      expect(getMinutesText(45)).toBe('минут');
    });

    it('должен возвращать "минута" для 51', () => {
      expect(getMinutesText(51)).toBe('минута');
    });

    it('должен возвращать "минуты" для 52', () => {
      expect(getMinutesText(52)).toBe('минуты');
    });

    it('должен возвращать "минут" для 55', () => {
      expect(getMinutesText(55)).toBe('минут');
    });

    it('должен возвращать "минут" для 59', () => {
      expect(getMinutesText(59)).toBe('минут');
    });
  });

  describe('Практические примеры (как будет выглядеть в сообщениях)', () => {
    it('должен правильно формировать "4 часа 0 минут"', () => {
      expect(`${4} ${getHoursText(4)} ${0} ${getMinutesText(0)}`).toBe('4 часа 0 минут');
    });

    it('должен правильно формировать "1 час 30 минут"', () => {
      expect(`${1} ${getHoursText(1)} ${30} ${getMinutesText(30)}`).toBe('1 час 30 минут');
    });

    it('должен правильно формировать "0 часов 15 минут"', () => {
      expect(`${0} ${getHoursText(0)} ${15} ${getMinutesText(15)}`).toBe('0 часов 15 минут');
    });

    it('должен правильно формировать "3 часа 45 минут"', () => {
      expect(`${3} ${getHoursText(3)} ${45} ${getMinutesText(45)}`).toBe('3 часа 45 минут');
    });

    it('должен правильно формировать "21 час 1 минута"', () => {
      expect(`${21} ${getHoursText(21)} ${1} ${getMinutesText(1)}`).toBe('21 час 1 минута');
    });

    it('должен правильно формировать "1 месяц"', () => {
      expect(`${1} ${getMonthsText(1)}`).toBe('1 месяц');
    });

    it('должен правильно формировать "3 месяца"', () => {
      expect(`${3} ${getMonthsText(3)}`).toBe('3 месяца');
    });

    it('должен правильно формировать "6 месяцев"', () => {
      expect(`${6} ${getMonthsText(6)}`).toBe('6 месяцев');
    });
  });
});
