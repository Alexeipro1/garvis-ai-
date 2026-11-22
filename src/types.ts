export type CoreState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type View = 'home' | 'chat' | 'panels' | 'about';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** Откуда ответ: демо-заготовка, настоящая модель или системное сообщение */
  source?: 'demo' | 'ai' | 'system';
}
