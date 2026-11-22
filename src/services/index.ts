import { DemoAssistant } from './demoAssistant';
import { RemoteAssistant, type RemoteConfig } from './remoteAssistant';
import type { AssistantProvider } from './assistant';
import { WebSpeechVoiceInput } from './voice';
import { WebSpeechOutput } from './speech';

const demo = new DemoAssistant();
/** Если сервер-посредник настроен — настоящая модель, иначе демо-ответы */
export const getAssistant = (cfg: RemoteConfig | null): AssistantProvider =>
  cfg ? new RemoteAssistant(cfg) : demo;

export const voice = new WebSpeechVoiceInput();
export const speech = new WebSpeechOutput();

/** Запущено как приложение с экрана «Домой» (PWA) */
export const isStandalone = (): boolean =>
  (navigator as unknown as { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;
