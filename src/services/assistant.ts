/**
 * Точка подключения настоящей AI-модели.
 *
 * Сейчас используется только DemoAssistant (локальные заготовки, без сети).
 * Чтобы подключить реальную модель, реализуйте этот интерфейс
 * (например, RemoteAssistant, который ходит на ВАШ собственный сервер —
 * ключи API никогда не должны храниться во фронтенде) и замените
 * провайдера в src/services/index.ts.
 */
export interface AssistantReply {
  text: string;
  /** true — ответ настоящей модели; false — демо-заготовка */
  isReal: boolean;
}

export interface AssistantProvider {
  readonly id: string;
  readonly label: string;
  readonly isReal: boolean;
  reply(input: string): Promise<AssistantReply>;
}
