import { todayParts } from '../services/time';
import { useNow } from '../hooks/useNow';

export const QUICK_COMMANDS = ['Привет', 'Который час?', 'Какая сегодня дата?', 'Погода', 'Напоминания', 'Календарь', 'Помощь'];

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="card__head">
        <h3>{title}</h3>
        {badge && <span className="badge">{badge}</span>}
      </header>
      {children}
    </section>
  );
}

function Calendar() {
  const now = useNow(60_000);
  const { year, month, day } = todayParts(now);
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = вс
  const offset = (first + 6) % 7; // неделя с понедельника
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <>
      <div className="cal__title">{MONTHS[month - 1]} {year}</div>
      <div className="cal">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d) => <span key={d} className="cal__dow">{d}</span>)}
        {cells.map((c, i) => (
          <span key={i} className={`cal__day ${c === day ? 'cal__day--today' : ''}`}>{c ?? ''}</span>
        ))}
      </div>
      <p className="muted">Сетка календаря настоящая; события из вашего календаря пока не подключены.</p>
    </>
  );
}

export function Panels({ compact, onCommand }: { compact?: boolean; onCommand: (t: string) => void }) {
  return (
    <div className="panels">
      <Card title="Быстрые команды">
        <div className="chips">
          {QUICK_COMMANDS.map((c) => (
            <button key={c} className="chip" onClick={() => onCommand(c)}>{c}</button>
          ))}
        </div>
      </Card>
      {!compact && (
        <>
          <Card title="Погода" badge="заглушка">
            <div className="placeholder">
              <span className="placeholder__big">— °C</span>
              <span className="muted">Данные о погоде не подключены. Здесь появится прогноз для вашего города.</span>
            </div>
          </Card>
          <Card title="Напоминания" badge="заглушка">
            <ul className="placeholder-list">
              <li>Напоминаний нет — сервис не подключён</li>
            </ul>
          </Card>
          <Card title="Календарь" badge="без событий">
            <Calendar />
          </Card>
        </>
      )}
    </div>
  );
}
