import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoreState, Message, View } from './types';
import { assistant, voice, speech, isStandalone } from './services';
import { VOICE_MESSAGES, type VoiceErrorCode } from './services/voice';
import { SPEECH_MESSAGES, prepareForSpeech } from './services/speech';
import { formatDate, formatTime, greetingFor, TIME_ZONE } from './services/time';
import { useNow } from './hooks/useNow';
import { AiCore, stateLabel } from './components/AiCore';
import { CommandBar } from './components/CommandBar';
import { BottomNav } from './components/BottomNav';
import { Chat } from './components/Chat';
import { Panels } from './components/Panels';
import { About } from './components/About';

const PREF_KEY = 'jarvis.speakReplies';
const loadPref = (): boolean => {
  try { return localStorage.getItem(PREF_KEY) === '1'; } catch { return false; }
};
const savePref = (v: boolean) => {
  try { localStorage.setItem(PREF_KEY, v ? '1' : '0'); } catch { /* ignore */ }
};

const PWA_HINT = ' Вы открыли приложение с экрана «Домой»: iOS в таком режиме часто ограничивает микрофон. Откройте сайт во вкладке Safari.';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [state, setStateRaw] = useState<CoreState>('idle');
  const [interim, setInterim] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [speakOn, setSpeakOn] = useState(loadPref);
  const nextId = useRef(1);
  const stateRef = useRef<CoreState>('idle');
  const timer = useRef<number>(0);
  const speakRef = useRef(speakOn);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const setState = useCallback((s: CoreState) => { stateRef.current = s; setStateRaw(s); }, []);
  const clearTimer = () => { window.clearTimeout(timer.current); };
  const later = (fn: () => void, ms: number) => { clearTimer(); timer.current = window.setTimeout(fn, ms); };

  const push = useCallback((role: Message['role'], text: string, source?: Message['source']) => {
    setMessages((m) => [...m, { id: nextId.current++, role, text, source }]);
  }, []);

  /** Состояние «ошибка»: понятное сообщение + красная индикация, затем возврат в ожидание */
  const fail = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    speech.cancel();
    push('assistant', text, 'system');
    setState('error');
    timer.current = window.setTimeout(() => setState('idle'), 3500);
  }, [push, setState]);

  const send = useCallback(async (text: string) => {
    if (stateRef.current === 'thinking') return;
    // Вызывается из обработчика тапа — здесь «разблокируем» озвучивание для iOS
    speech.unlock();
    speech.cancel();
    clearTimer();
    push('user', text);
    setState('thinking');
    try {
      const r = await assistant.reply(text);
      push('assistant', r.text, r.isReal ? 'ai' : 'demo');
      setState('speaking');
      if (speakRef.current && speech.available) {
        speech.speak(prepareForSpeech(r.text), {
          onEnd: () => setState('idle'),
          onError: (code) => fail(SPEECH_MESSAGES[code]),
        });
      } else {
        // Озвучивание выключено: короткая визуальная индикация ответа
        later(() => setState('idle'), Math.min(4000, 1200 + r.text.length * 25));
      }
    } catch {
      fail('Не удалось получить ответ.');
    }
  }, [push, fail, setState]);

  const voiceFail = (code: VoiceErrorCode) => {
    const hint = isStandalone() && (code === 'unsupported' || code === 'permission' || code === 'unknown') ? PWA_HINT : '';
    fail(VOICE_MESSAGES[code] + hint);
  };

  const onMic = () => {
    const s = stateRef.current;
    if (s === 'listening') { voice.stop(); return; }                       // стоп записи
    if (s === 'speaking') { speech.cancel(); clearTimer(); setState('idle'); return; } // стоп озвучивания
    if (s === 'thinking') return;
    if (!voice.available) {
      voiceFail('unsupported');
      inputRef.current?.focus(); // предлагаем текстовый ввод
      return;
    }
    speech.unlock();
    speech.cancel();
    clearTimer();
    setInterim('');
    setState('listening');
    voice.start({
      onInterim: setInterim,
      onFinal: (t) => { setInterim(''); void send(t); },
      onError: voiceFail,
      onEnd: () => { setInterim(''); if (stateRef.current === 'listening') setState('idle'); },
    });
  };

  const toggleSpeak = () => {
    if (!speech.available) {
      push('assistant', SPEECH_MESSAGES.unsupported, 'system');
      return;
    }
    const next = !speakOn;
    setSpeakOn(next);
    speakRef.current = next;
    savePref(next);
    if (next) speech.unlock();
    else if (stateRef.current === 'speaking') { speech.cancel(); clearTimer(); setState('idle'); }
  };

  // Прячем приложение — останавливаем звук и запись
  useEffect(() => {
    const onHide = () => {
      if (!document.hidden) return;
      speech.cancel();
      if (stateRef.current === 'speaking') setState('idle');
      if (stateRef.current === 'listening') voice.stop();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      clearTimer();
      speech.cancel();
    };
  }, [setState]);

  const goChatAndSend = (t: string) => { setView('chat'); void send(t); };
  const lastReply = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="app">
      <div className="bg" aria-hidden />
      <header className="top">
        <div className="top__brand">J.A.R.V.I.S.</div>
        <div className="top__right">
          <span className="top__tz">{TIME_ZONE}</span>
          <button
            type="button"
            className={`icon-btn ${speakOn && speech.available ? 'icon-btn--on' : ''}`}
            onClick={toggleSpeak}
            aria-pressed={speakOn && speech.available}
            aria-label={speakOn ? 'Выключить озвучивание ответов' : 'Включить озвучивание ответов'}
            title="Озвучивание ответов"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9v6h4l5 4V5L8 9z" />
              {speakOn && speech.available ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
            </svg>
          </button>
        </div>
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

      {(view === 'home' || view === 'chat') && <CommandBar state={state} interim={interim} inputRef={inputRef} onSend={send} onMic={onMic} />}
      <BottomNav view={view} onChange={setView} />
    </div>
  );
}
