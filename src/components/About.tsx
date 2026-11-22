import { assistant, voice } from '../services';
import { TIME_ZONE } from '../services/time';

const rows: [string, string, boolean][] = [
  ['Часовой пояс', TIME_ZONE, true],
  ['Ассистент', assistant.label, false],
  ['Настоящая AI-модель', 'не подключена', false],
  ['Голосовой ввод', voice.available ? 'доступен (ru-RU, средствами браузера)' : 'не поддерживается этим браузером', voice.available],
  ['Apple Shortcuts', 'подготовлено в коде, не включено', false],
  ['Погода / календарь / напоминания', 'заглушки', false],
];

export function About() {
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
      <section className="card">
        <header className="card__head"><h3>О проекте</h3></header>
        <p className="muted">
          Это демонстрационный интерфейс. Ответы в чате — локальные заготовки, а не настоящий искусственный интеллект.
          Платные API и ключи не используются. Подробности — в README.
        </p>
      </section>
    </div>
  );
}
