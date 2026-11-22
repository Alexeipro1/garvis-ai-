/**
 * Точка подключения языковой модели.
 *
 * DemoAssistant — локальные заготовки (без сети, не AI).
 * RemoteAssistant — запросы к ВАШЕМУ серверу-посреднику (папка worker/),
 * который хранит ключ Anthropic. Ключ API никогда не попадает в приложение.
 */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantReply {
  text: string;
  /** true — ответ настоящей модели; false — демо-заготовка */
  isReal: boolean;
}

export interface AssistantProvider {
  readonly id: string;
  readonly label: string;
  readonly isReal: boolean;
  /** turns — контекст разговора; последняя реплика — вопрос пользователя */
  reply(turns: ChatTurn[]): Promise<AssistantReply>;
}

export type ChatErrorCode =
  | 'offline' | 'network' | 'timeout' | 'unauthorized' | 'rate_limited' | 'daily_limit'
  | 'busy' | 'billing' | 'server_config' | 'too_long' | 'forbidden' | 'server';

export class ChatError extends Error {
  code: ChatErrorCode;
  retryable: boolean;
  retryAfter?: number;
  constructor(code: ChatErrorCode, message: string, retryable: boolean, retryAfter?: number) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}
