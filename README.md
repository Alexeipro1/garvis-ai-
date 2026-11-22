# J.A.R.V.I.S. — персональный AI-ассистент (PWA, демо v0.1)

Mobile-first веб-приложение: React + TypeScript + Vite. Зависимости: только `react`, `react-dom` (+ dev: vite, typescript).

> **Важно:** сейчас это демонстрационный интерфейс. Ответы в чате — локальные заготовки (помечены «ДЕМО-ОТВЕТ»),
> настоящая AI-модель не подключена. Погода, напоминания и события календаря — заглушки. Платные API и ключи не используются.

## Команды
```bash
npm install
npm run dev       # разработка (доступна по сети)
npm run build     # проверка типов + production-сборка в dist/
npm run preview   # просмотр собранной версии (порт 4173)
```

## Архитектура
- `src/services/assistant.ts` — интерфейс `AssistantProvider`: сюда подключается настоящая модель (через ВАШ сервер; ключи не хранить во фронтенде).
- `src/services/demoAssistant.ts` — текущий локальный демо-провайдер.
- `src/services/voice.ts` — голосовой ввод через Web Speech API (ru-RU), средствами браузера/iOS. В режиме PWA на экране «Домой» на iPhone может не работать (ограничение iOS) — тогда открывайте сайт во вкладке Safari.
- `src/services/speech.ts` — озвучивание ответов через SpeechSynthesis (ru-RU). Переключатель 🔊 вверху справа, по умолчанию выключено; на iOS «разблокируется» тапом пользователя.
- `src/services/shortcuts.ts` — помощник для Apple Shortcuts (`shortcuts://run-shortcut`), пока не используется.
- `src/services/time.ts` — время/дата в часовом поясе `Asia/Jerusalem`.
- `src/services/index.ts` — единая точка замены реализаций.

## Установка на iPhone
Откройте опубликованный по HTTPS адрес в Safari → «Поделиться» → «На экран “Домой”».
