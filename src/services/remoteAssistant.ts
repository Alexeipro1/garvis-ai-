import { ChatError, type AssistantProvider, type AssistantReply, type ChatTurn } from './assistant';

export interface RemoteConfig {
  /** Адрес сервера-посредника, например https://jarvis-api.<имя>.workers.dev */
  endpoint: string;
  /** Личный ключ доступа к посреднику (НЕ ключ Anthropic) */
  accessKey: string;
}

const TIMEOUT_MS = 25_000;

const MESSAGES: Record<string, [ConstructorParameters<typeof ChatError>[0], string, boolean]> = {
  unauthorized: ['unauthorized', 'Сервер не принял ключ доступа. Проверьте его на вкладке «О системе».', false],
  daily_limit: ['daily_limit', 'Суточный лимит запросов исчерпан. Он обновится завтра.', false],
  rate_limited: ['rate_limited', 'Слишком много запросов подряд.', true],
  upstream_busy: ['busy', 'Модель сейчас перегружена. Повторите чуть позже.', true],
  upstream_timeout: ['timeout', 'Сервер слишком долго не отвечает. Повторите попытку.', true],
  upstream_network: ['server', 'Сервер не смог связаться с моделью. Повторите попытку.', true],
  upstream_error: ['server', 'Сервер вернул ошибку. Повторите попытку.', true],
  empty: ['server', 'Модель вернула пустой ответ. Повторите попытку.', true],
  billing: ['billing', 'На счёте Anthropic закончились средства. Пополните баланс в консоли Anthropic.', false],
  server_misconfigured: ['server_config', 'Сервер настроен неверно: проблема с ключом Anthropic. Проверьте секреты в Cloudflare.', false],
  not_configured: ['server_config', 'Сервер не настроен: не задан ключ Anthropic.', false],
  too_long: ['too_long', 'Сообщение слишком длинное (максимум 2000 символов).', false],
  too_large: ['too_long', 'Сообщение слишком длинное.', false],
  forbidden_origin: ['forbidden', 'Сервер не принимает запросы с этого адреса. Проверьте ALLOWED_ORIGIN в настройках Worker.', false],
};

/** Нормализует адрес: только https (http — для локальной разработки) и без завершающего «/» */
export function normalizeEndpoint(raw: string): string | null {
  const v = raw.trim().replace(/\/+$/, '');
  try {
    const u = new URL(v);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.origin;
  } catch { /* ignore */ }
  return null;
}

async function request(cfg: RemoteConfig, path: string, init: RequestInit): Promise<Response> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ChatError('offline', 'Нет подключения к интернету. Проверьте сеть и повторите.', true);
  }
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(cfg.endpoint + path, {
      ...init,
      headers: { Authorization: `Bearer ${cfg.accessKey}`, 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ChatError('timeout', 'Сервер слишком долго не отвечает. Повторите попытку.', true);
    }
    throw new ChatError('network', 'Не удалось связаться с сервером. Проверьте сеть и адрес в настройках.', true);
  } finally {
    window.clearTimeout(timer);
  }
}

async function toError(res: Response): Promise<ChatError> {
  let code = '';
  let retryAfter: number | undefined;
  try {
    const j = (await res.json()) as { error?: string; retryAfter?: number };
    code = j.error ?? '';
    retryAfter = j.retryAfter;
  } catch { /* тело не JSON */ }
  if (res.status === 401) code = 'unauthorized';
  const m = MESSAGES[code];
  if (m) {
    const wait = code === 'rate_limited' ? (retryAfter ? ` Подождите ${retryAfter} с и повторите.` : ' Немного подождите и повторите.') : '';
    return new ChatError(m[0], m[1] + wait, m[2], retryAfter);
  }
  return new ChatError('server', `Сервер вернул ошибку (${res.status}). Повторите попытку.`, true);
}

export class RemoteAssistant implements AssistantProvider {
  readonly id = 'remote';
  readonly label = 'Claude (через ваш сервер)';
  readonly isReal = true;
  private cfg: RemoteConfig;

  constructor(cfg: RemoteConfig) {
    this.cfg = cfg;
  }

  async reply(turns: ChatTurn[]): Promise<AssistantReply> {
    const res = await request(this.cfg, '/chat', { method: 'POST', body: JSON.stringify({ messages: turns }) });
    if (!res.ok) throw await toError(res);
    const j = (await res.json()) as { text?: string; error?: string };
    if (j.error === 'refused') return { text: 'Прошу прощения, Алексей, с этим запросом я помочь не могу.', isReal: true };
    if (!j.text) throw new ChatError('server', 'Сервер вернул пустой ответ. Повторите попытку.', true);
    return { text: j.text, isReal: true };
  }
}

/** Проверка адреса и ключа доступа без обращения к Anthropic и без расхода лимита */
export async function verifyRemote(cfg: RemoteConfig): Promise<{ remainingToday: number }> {
  const res = await request(cfg, '/verify', { method: 'GET' });
  if (!res.ok) throw await toError(res);
  const j = (await res.json()) as { remainingToday?: number };
  return { remainingToday: j.remainingToday ?? 0 };
}
