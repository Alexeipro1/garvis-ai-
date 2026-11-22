import { DemoAssistant } from './demoAssistant';
import { VoiceInputStub } from './voice';

// Здесь заменяются реализации при подключении настоящих сервисов.
export const assistant = new DemoAssistant();
export const voice = new VoiceInputStub();
