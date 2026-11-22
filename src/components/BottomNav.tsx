import type { View } from '../types';

const ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'home', label: 'Главная', icon: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z' },
  { id: 'chat', label: 'Чат', icon: 'M4 5h16v11H9l-5 4z' },
  { id: 'panels', label: 'Панели', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { id: 'about', label: 'О системе', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5' },
];

export function BottomNav({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav className="nav" aria-label="Навигация">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          className={`nav__item ${view === it.id ? 'nav__item--active' : ''}`}
          onClick={() => onChange(it.id)}
          aria-current={view === it.id ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
            <path d={it.icon} />
          </svg>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
