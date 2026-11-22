# J.A.R.V.I.S. — персональный AI-ассистент (PWA, демо v0.1)

Mobile-first веб-приложение: React + TypeScript + Vite. Зависимости: только `react`, `react-dom` (+ dev: vite, typescript).

> **Важно:** пока сервер-посредник не подключён, ответы в чате — локальные заготовки (помечены «ДЕМО-ОТВЕТ»), а не AI.
> После подключения (см. `worker/README.md`) ответы приходят от Claude и помечаются «AI». Ключ Anthropic хранится только на сервере.
> Погода, напоминания и события календаря — заглушки.

## Команды
```bash
npm install
npm run dev       # разработка (доступна по сети)
npm run build     # проверка типов + production-сборка в dist/
npm run preview   # просмотр собранной версии (порт 4173)
```

## Архитектура
- `src/services/assistant.ts` — интерфейс `AssistantProvider` и типы ошибок чата.
- `src/services/demoAssistant.ts` — локальный демо-провайдер (не AI).
- `src/services/remoteAssistant.ts` — клиент сервера-посредника (контекст разговора, таймаут, ошибки сети и лимитов).
- `src/services/settings.ts` — адрес сервера, ключ доступа и история на устройстве.
- `worker/` — Cloudflare Worker с авторизацией, лимитами и системными инструкциями (см. `worker/README.md`).
- `src/services/voice.ts` — голосовой ввод через Web Speech API (ru-RU), средствами браузера/iOS. В режиме PWA на экране «Домой» на iPhone может не работать (ограничение iOS) — тогда открывайте сайт во вкладке Safari.
- `src/services/speech.ts` — озвучивание ответов через SpeechSynthesis (ru-RU). Переключатель 🔊 вверху справа, по умолчанию выключено; на iOS «разблокируется» тапом пользователя.
- `src/services/shortcuts.ts` — помощник для Apple Shortcuts (`shortcuts://run-shortcut`), пока не используется.
- `src/services/time.ts` — время/дата в часовом поясе `Asia/Jerusalem`.
- `src/services/index.ts` — единая точка замены реализаций.

## Установка на iPhone
Откройте опубликованный по HTTPS адрес в Safari → «Поделиться» → «На экран “Домой”».
