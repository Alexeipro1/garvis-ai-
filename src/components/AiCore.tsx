import type { CoreState } from '../types';

const LABELS: Record<CoreState, string> = {
  idle: 'Ожидание',
  listening: 'Слушаю…',
  thinking: 'Думаю…',
  speaking: 'Отвечаю…',
  error: 'Ошибка',
};

export function AiCore({ state }: { state: CoreState }) {
  return (
    <div className={`core core--${state}`} role="img" aria-label={`AI Core: ${LABELS[state]}`}>
      <div className="core__halo" />
      <div className="core__ring core__ring--outer" />
      <div className="core__ring core__ring--mid" />
      <div className="core__ring core__ring--inner" />
      <div className="core__wave" />
      <div className="core__wave core__wave--2" />
      <div className="core__orb">
        <span className="core__logo">J</span>
      </div>
    </div>
  );
}

export const stateLabel = (s: CoreState) => LABELS[s];
