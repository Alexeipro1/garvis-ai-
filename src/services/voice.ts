/**
 * Точка подключения голосового ввода.
 * Сейчас реализация-заглушка. Позже здесь можно использовать Web Speech API
 * (SpeechRecognition, ru-RU) или запись аудио + распознавание на сервере.
 */
export interface VoiceInput {
  readonly available: boolean;
  start(onResult: (text: string) => void, onEnd: () => void): void;
  stop(): void;
}

export class VoiceInputStub implements VoiceInput {
  readonly available = false;
  start(_onResult: (text: string) => void, onEnd: () => void) {
    onEnd();
  }
  stop() {}
}
