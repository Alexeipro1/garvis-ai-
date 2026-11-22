import { DemoAssistant } from './demoAssistant';
import { WebSpeechVoiceInput } from './voice';
import { WebSpeechOutput } from './speech';

// Здесь заменяются реализации при подключении настоящих сервисов.
export const assistant = new DemoAssistant();
export const voice = new WebSpeechVoiceInput();
export const speech = new WebSpeechOutput();

/** Запущено как приложение с экрана «Домой» (PWA) */
export const isStandalone = (): boolean =>
  (navigator as unknown as { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;
