import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoreState, Message, View } from './types';
import { assistant, voice } from './services';
import { VOICE_MESSAGES } from './services/voice';
import { formatDate, formatTime, greetingFor, TIME_ZONE } from './services/time';
import { useNow } from './hooks/useNow';
import { AiCore, stateLabel } from './components/AiCore';
import { CommandBar } from './components/CommandBar';
import { BottomNav } from './components/BottomNav';
import { Chat } from './components/Chat';
import { Panels } from './components/Panels';
import { About } from './components/About';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [state, setState] = useState<CoreState>('idle');
  const [interim, setInterim] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const now = useNow();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const push = useCallback((role: Message['role'], text: string, source?: Message['source']) => {
    setMessages((m) => [...m, { id: nextId.current++, role, text, source }]);
  }, []);

  const send = useCallback(async (text: string) => {
    push('user', text);
    setState('thinking');
    try {
      const r = await assistant.reply(text);
      push('assistant', r.text, r.isReal ? 'ai' : 'demo');
      setState('speaking');
      later(() => setState('idle'), Math.min(4000, 1200 + r.text.length * 25));
    } catch {
      push('assistant', 'Не удалось получить ответ.', 'system');
      setState('idle');
    }
  }, [push]);

  const onMic = () => {
    if (state === 'listening') { voice.stop(); return; }
    if (state !== 'idle') return;
    if (!voice.available) {
      push('assistant', VOICE_MESSAGES.unsupported, 'system');
      return;
    }
    setInterim('');
    setState('listening');
    voice.start({
      onInterim: setInterim,
      onFinal: (t) => { setInterim(''); void send(t); },
      onError: (code) => push('assistant', VOICE_MESSAGES[code], 'system'),
      onEnd: () => { setInterim(''); setState((s) => (s === 'listening' ? 'idle' : s)); },
    });
  };

  const goChatAndSend = (t: string) => { setView('chat'); void send(t); };
  const lastReply = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="app">
      <div className="bg" aria-hidden />
      <header className="top">
        <div className="top__brand">J.A.R.V.I.S.</div>
        <div className="top__tz">{TIME_ZONE}</div>
      </header>

      <main className="main" key={view}>
        {view === 'home' && (
          <div className="home">
            <p className="greet">{greetingFor(now)}</p>
            <h1 className="welcome">Добро пожаловать, Алексей</h1>
            <AiCore state={state} />
            <div className={`status-pill status-pill--${state}`}>{stateLabel(state)}</div>
            <div className="clock">{formatTime(now)}</div>
            <div className="date">{formatDate(now)}</div>
            {lastReply && (
              <div className="reply">
                <span className={`tag tag--${lastReply.source}`}>{lastReply.source === 'demo' ? 'ДЕМО-ОТВЕТ' : lastReply.source === 'ai' ? 'AI' : 'СИСТЕМА'}</span>
                {lastReply.text}
              </div>
            )}
            <Panels compact onCommand={goChatAndSend} />
          </div>
        )}
        {view === 'chat' && <Chat messages={messages} />}
        {view === 'panels' && <Panels onCommand={goChatAndSend} />}
        {view === 'about' && <About />}
      </main>

      {(view === 'home' || view === 'chat') && <CommandBar state={state} interim={interim} onSend={send} onMic={onMic} />}
      <BottomNav view={view} onChange={setView} />
    </div>
  );
}
