/**
 * Озвучивание ответов через SpeechSynthesis API (русский язык).
 *
 * Особенности iOS Safari:
 *  - первое воспроизведение должно быть запущено из обработчика действия
 *    пользователя (тап). Ответ приходит чуть позже, поэтому на тапе вызывается
 *    unlock(): беззвучная пустая реплика «разблокирует» синтез речи.
 *  - голоса берутся из системы (Настройки → Универсальный доступ → Устный
 *    контент → Голоса); если русского голоса нет, речь может быть на другом языке.
 *  - Ничего не отправляется на внешние серверы нашим кодом.
 */
export type SpeechErrorCode = 'blocked' | 'failed';

export interface SpeakCallbacks {
  onStart?: () => void;
  /** Озвучивание закончилось само (не вызывается после cancel()) */
  onEnd: () => void;
  onError: (code: SpeechErrorCode) => void;
}

export interface SpeechOutput {
  readonly available: boolean;
  /** true, если в системе найден русский голос (null — список голосов ещё не загружен) */
  readonly hasRussianVoice: boolean | null;
  unlock(): void;
  speak(text: string, cb: SpeakCallbacks): void;
  cancel(): void;
}

/** Подготовка текста: убираем скобки и читаем время словами */
export function prepareForSpeech(text: string): string {
  return text
    .replace(/\([^)]*\)/g, '')
    .replace(/(\d{1,2}):(\d{2})(?::\d{2})?/g, '$1 ч $2 мин')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export class WebSpeechOutput implements SpeechOutput {
  private voice: SpeechSynthesisVoice | null = null;
  private current = 0;
  private unlocked = false;

  constructor() {
    if (this.available) {
      this.pickVoice();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.pickVoice());
    }
  }

  get available() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  get hasRussianVoice(): boolean | null {
    if (!this.available) return false;
    if (window.speechSynthesis.getVoices().length === 0) return null;
    return this.voice !== null;
  }

  private pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    const ru = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ru'));
    this.voice = ru.find((v) => v.lang.toLowerCase().replace('_', '-') === 'ru-ru') ?? ru[0] ?? null;
  }

  unlock() {
    if (!this.available || this.unlocked) return;
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      this.unlocked = true;
    } catch {
      /* ignore */
    }
  }

  speak(text: string, cb: SpeakCallbacks) {
    if (!this.available || !text) {
      cb.onEnd();
      return;
    }
    this.cancel();
    const id = this.current;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    if (this.voice) u.voice = this.voice;
    u.rate = 1;
    u.onstart = () => { if (id === this.current) cb.onStart?.(); };
    u.onend = () => { if (id === this.current) cb.onEnd(); };
    u.onerror = (e) => {
      if (id !== this.current) return; // отменено нами
      cb.onError(e.error === 'not-allowed' ? 'blocked' : 'failed');
    };
    try {
      window.speechSynthesis.speak(u);
    } catch {
      cb.onError('failed');
    }
  }

  cancel() {
    this.current++; // устаревшие колбэки будут проигнорированы
    if (this.available) window.speechSynthesis.cancel();
  }
}

export const SPEECH_MESSAGES: Record<SpeechErrorCode | 'unsupported', string> = {
  unsupported: 'Озвучивание не поддерживается в этом браузере. Ответы остаются текстовыми.',
  blocked: 'Браузер не разрешил воспроизведение звука. Нажмите на значок динамика и отправьте команду ещё раз.',
  failed: 'Не удалось озвучить ответ. Проверьте громкость и беззвучный режим, затем попробуйте ещё раз.',
};
