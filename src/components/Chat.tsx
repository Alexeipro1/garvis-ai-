import { useEffect, useRef } from 'react';
import type { Message } from '../types';

const SRC_LABEL = { demo: 'ДЕМО-ОТВЕТ', ai: 'AI', system: 'СИСТЕМА' } as const;

interface Props {
  messages: Message[];
  retryText: string | null;
  onRetry: (t: string) => void;
  onClear: () => void;
}

export function Chat({ messages, retryText, onRetry, onClear }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, retryText]);

  if (messages.length === 0) {
    return <p className="muted center">Напишите команду, например «помощь».</p>;
  }
  return (
    <div className="chat">
      {messages.map((m) => (
        <div key={m.id} className={`bubble bubble--${m.role}`}>
          {m.role === 'assistant' && m.source && <span className={`tag tag--${m.source}`}>{SRC_LABEL[m.source]}</span>}
          {m.text}
        </div>
      ))}
      {retryText && <button type="button" className="chip chip--retry" onClick={() => onRetry(retryText)}>Повторить</button>}
      <button type="button" className="link-btn" onClick={onClear}>Очистить историю</button>
      <div ref={end} />
    </div>
  );
}
