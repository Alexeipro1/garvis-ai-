import { useState } from 'react';
import { getAssistant, voice, speech, isStandalone } from '../services';
import { RemoteSettings } from './RemoteSettings';
import type { RemoteConfig } from '../services/remoteAssistant';
import { TIME_ZONE } from '../services/time';

const buildRows = (cfg: RemoteConfig | null): [string, string, boolean][] => [
  ['Часовой пояс', TIME_ZONE, true],
  ['Ассистент', getAssistant(cfg).label, !!cfg],
  ['Настоящая AI-модель', cfg ? 'подключена (через ваш сервер)' : 'не подключена', !!cfg],
  ['Голосовой ввод', voice.available ? 'доступен (ru-RU, средствами браузера)' : 'не поддерживается этим браузером', voice.available],
  ['Русский голос', speech.voiceName ?? 'не найден', speech.voiceName !== null],
  ['Озвучивание ответов', !speech.available ? 'не поддерживается' : speech.hasRussianVoice === false ? 'доступно, но русский голос не найден' : 'доступно (ru-RU)', speech.available && speech.hasRussianVoice !== false],
  ['Режим запуска', isStandalone() ? 'приложение с экрана «Домой»' : 'вкладка браузера', true],
  ['Защищённое соединение (HTTPS)', window.isSecureContext ? 'да' : 'нет — микрофон не будет работать', window.isSecureContext],
  ['Apple Shortcuts', 'подготовлено в коде, не включено', false],
  ['Погода / календарь / напоминания', 'заглушки', false],
];

interface Props {
  cfg: RemoteConfig | null;
  onCfg: (c: RemoteConfig | null) => void;
  onClearHistory: () => void;
  historyCount: number;
}

export function About({ cfg, onCfg, onClearHistory, historyCount }: Props) {
  const rows = buildRows(cfg);
  const [test, setTest] = useState('');
  const runTest = () => {
    if (!speech.available) { setTest('Озвучивание не поддерживается этим браузером.'); return; }
    speech.unlock();
    setTest('Запускаю…');
    speech.speak('Здравствуйте, Алексей. Голос работает.', {
      onStart: () => setTest('Звучит. Если вы ничего не слышите — выключите беззвучный режим и добавьте громкость.'),
      onEnd: () => setTest('Готово: воспроизведение завершено.'),
      onError: (c) => setTest(c === 'silent' ? 'Звук не воспроизведён: проверьте беззвучный режим и громкость.' : c === 'blocked' ? 'Браузер заблокировал звук.' : 'Ошибка озвучивания.'),
    });
  };
  return (
    <div className="panels">
      <section className="card">
        <header className="card__head"><h3>Состояние систем</h3><span className="badge">v0.1</span></header>
        <ul className="status">
          {rows.map(([k, v, ok]) => (
            <li key={k}><span>{k}</span><b className={ok ? 'ok' : 'off'}>{v}</b></li>
          ))}
        </ul>
      </section>
      <RemoteSettings cfg={cfg} onCfg={onCfg} />
      <section className="card">
        <header className="card__head"><h3>История</h3></header>
        <p className="muted" style={{ marginTop: 0 }}>Сохранённых сообщений на этом устройстве: {historyCount}. История хранится только на телефоне.</p>
        <button type="button" className="chip" onClick={onClearHistory} disabled={historyCount === 0}>Очистить историю</button>
      </section>
      <section className="card">
        <header className="card__head"><h3>Проверка голоса</h3></header>
        <button type="button" className="chip" onClick={runTest}>Проверить озвучивание</button>
        {test && <p className="muted" role="status">{test}</p>}
      </section>
      <section className="card">
        <header className="card__head"><h3>О проекте</h3></header>
        <p className="muted">
          Пока сервер-посредник не подключён, ответы в чате — локальные заготовки (ДЕМО-ОТВЕТ), а не искусственный интеллект. После подключения ответы помечаются «AI» и приходят от модели Claude через ваш сервер. Подробности — в README.
        </p>
      </section>
    </div>
  );
}
