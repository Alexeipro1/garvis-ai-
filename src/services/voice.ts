/**
 * Голосовой ввод на базе Web Speech API (SpeechRecognition, ru-RU).
 *
 * Важно: в Safari на iPhone распознавание обычно работает во вкладке браузера,
 * а в приложении, добавленном на экран «Домой» (PWA), может быть недоступно —
 * это ограничение iOS. Распознавание выполняет сам браузер/система; текст
 * никуда не отправляется нашим кодом. Ничего не записывается и не сохраняется.
 */
export type VoiceErrorCode =
  | 'unsupported'
  | 'permission'
  | 'no-speech'
  | 'audio'
  | 'network'
  | 'unknown';

export interface VoiceCallbacks {
  /** Промежуточный (ещё не финальный) текст */
  onInterim: (text: string) => void;
  /** Финальный распознанный текст */
  onFinal: (text: string) => void;
  onError: (code: VoiceErrorCode) => void;
  /** Сессия распознавания завершена (всегда вызывается в конце) */
  onEnd: () => void;
}

export interface VoiceInput {
  readonly available: boolean;
  start(cb: VoiceCallbacks): void;
  stop(): void;
}

// Минимальные типы: SpeechRecognition отсутствует в стандартных типах TypeScript.
interface SRAlternative { transcript: string }
interface SRResult { readonly isFinal: boolean; readonly length: number; [i: number]: SRAlternative }
interface SREvent { readonly resultIndex: number; readonly results: { readonly length: number; [i: number]: SRResult } }
interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRConstructor = new () => SRInstance;

function getCtor(): SRConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const ERRORS: Record<string, VoiceErrorCode> = {
  'not-allowed': 'permission',
  'service-not-allowed': 'permission',
  'no-speech': 'no-speech',
  'audio-capture': 'audio',
  network: 'network',
};

export class WebSpeechVoiceInput implements VoiceInput {
  private rec: SRInstance | null = null;
  private stopped = false;

  get available() {
    return getCtor() !== undefined;
  }

  start(cb: VoiceCallbacks) {
    const Ctor = getCtor();
    if (!Ctor) {
      cb.onError('unsupported');
      cb.onEnd();
      return;
    }
    const rec = new Ctor();
    this.rec = rec;
    this.stopped = false;
    rec.lang = 'ru-RU';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = '';
    let failed = false;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) cb.onInterim(finalText + interim);
    };
    rec.onerror = (e) => {
      failed = true;
      cb.onError(ERRORS[e.error] ?? 'unknown');
    };
    rec.onend = () => {
      this.rec = null;
      const text = finalText.trim();
      if (text) cb.onFinal(text);
      else if (!failed && !this.stopped) cb.onError('no-speech');
      cb.onEnd();
    };
    try {
      rec.start();
    } catch {
      this.rec = null;
      cb.onError('unknown');
      cb.onEnd();
    }
  }

  /** Остановить запись; уже распознанное будет передано в onFinal */
  stop() {
    this.stopped = true;
    this.rec?.stop();
  }
}

export const VOICE_MESSAGES: Record<VoiceErrorCode, string> = {
  unsupported: 'Голосовой ввод не поддерживается в этом браузере. Попробуйте Safari (во вкладке) или вводите команды текстом.',
  permission: 'Нет доступа к микрофону или распознаванию речи. Разрешите их: Настройки iPhone → Safari → Микрофон, а также Настройки → Основные → Клавиатура → Диктовка.',
  'no-speech': 'Речь не распознана. Нажмите на микрофон и говорите сразу после нажатия.',
  audio: 'Микрофон недоступен. Проверьте, что им не пользуется другое приложение.',
  network: 'Распознавание речи недоступно: нужна сеть (iOS распознаёт речь через сервис Apple).',
  unknown: 'Не удалось запустить голосовой ввод. Попробуйте ещё раз или откройте сайт во вкладке Safari.',
};
