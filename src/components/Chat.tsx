import { useEffect, useRef } from 'react';
import type { Message } from '../types';

const SRC_LABEL = { demo: 'ДЕМО-ОТВЕТ', ai: 'AI', system: 'СИСТЕМА' } as const;

export function Chat({ messages }: { messages: Message[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
      <div ref={end} />
    </div>
  );
}
