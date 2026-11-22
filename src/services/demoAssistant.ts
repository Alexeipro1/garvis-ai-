import type { AssistantProvider, AssistantReply } from './assistant';
import { formatDate, formatTime, TIME_ZONE } from './time';

/**
 * Локальный демонстрационный «ассистент»: простые правила по ключевым словам.
 * Это НЕ искусственный интеллект и не обращается к сети.
 */
const rules: { match: RegExp; answer: () => string }[] = [
  { match: /привет|здравствуй|добрый/i, answer: () => 'Здравствуйте, Алексей! Я работаю в демонстрационном режиме.' },
  { match: /врем|который час|сколько.*час/i, answer: () => `Сейчас ${formatTime(new Date())} (${TIME_ZONE}).` },
  { match: /дат|число|день|сегодня/i, answer: () => `Сегодня ${formatDate(new Date())}.` },
  { match: /погод/i, answer: () => 'Данные о погоде пока не подключены — на панели показана заглушка.' },
  { match: /напомин|задач/i, answer: () => 'Напоминания пока не подключены. Панель напоминаний — заглушка.' },
  { match: /календар|событи|встреч/i, answer: () => 'Календарь пока не подключён: реальных событий я не вижу.' },
  { match: /шорткат|shortcut|команд.*apple/i, answer: () => 'Интеграция с Apple Shortcuts подготовлена в коде, но ещё не включена.' },
  { match: /кто ты|ты кто|что ты|как тебя/i, answer: () => 'Я J.A.R.V.I.S. — прототип интерфейса. Настоящая AI-модель пока не подключена; мои ответы — заготовки.' },
  { match: /помощ|умеешь|что можешь|help/i, answer: () => 'В демо-режиме я понимаю: «привет», «время», «дата», «погода», «напоминания», «календарь», «шорткаты», «кто ты».' },
  { match: /спасибо|благодар/i, answer: () => 'Пожалуйста, Алексей.' },
];

export class DemoAssistant implements AssistantProvider {
  readonly id = 'demo';
  readonly label = 'Демо (локально, без AI)';
  readonly isReal = false;

  async reply(input: string): Promise<AssistantReply> {
    await new Promise((r) => setTimeout(r, 700)); // имитация «раздумья» для анимации
    const rule = rules.find((r) => r.match.test(input));
    const text = rule
      ? rule.answer()
      : 'Эту команду я пока не понимаю: это демо без настоящей AI-модели. Напишите «помощь», чтобы увидеть список.';
    return { text, isReal: false };
  }
}
