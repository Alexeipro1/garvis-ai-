import { useState, type FormEvent } from 'react';
import type { CoreState } from '../types';

interface Props {
  state: CoreState;
  /** Текст, распознаваемый голосом в реальном времени */
  interim: string;
  onSend: (text: string) => void;
  onMic: () => void;
}

export function CommandBar({ state, interim, onSend, onMic }: Props) {
  const [text, setText] = useState('');
  const busy = state === 'thinking' || state === 'speaking';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  return (
    <form className="cmdbar" onSubmit={submit}>
      <button
        type="button"
        className={`mic ${state === 'listening' ? 'mic--on' : ''}`}
        onClick={onMic}
        aria-label="Микрофон"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
      <input
        value={state === 'listening' ? interim : text}
        readOnly={state === 'listening'}
        onChange={(e) => setText(e.target.value)}
        placeholder={state === 'listening' ? 'Говорите…' : 'Введите команду…'}
        enterKeyHint="send"
        autoComplete="off"
        aria-label="Текстовая команда"
      />
      <button type="submit" className="send" disabled={!text.trim() || busy} aria-label="Отправить">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
