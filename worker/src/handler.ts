import { checkAccessKey } from './auth.ts';
import { buildSystemPrompt } from './prompt.ts';
import { MAX_BODY_BYTES, parseTurns, type Turn } from './validate.ts';

export interface ModelResult {
  text: string;
  refused: boolean;
}
export type UpstreamKind = 'rate_limit' | 'auth' | 'billing' | 'timeout' | 'network' | 'other';
export class UpstreamError extends Error {
  kind: UpstreamKind;
  constructor(kind: UpstreamKind) {
    super(kind);
    this.kind = kind;
  }
}
export type CallModel = (a: { apiKey: string; model: string; system: string; turns: Turn[] }) => Promise<ModelResult>;

export interface Env {
  ANTHROPIC_API_KEY?: string;
  ACCESS_KEY?: string;
  MODEL?: string;
  DAILY_LIMIT?: string;
  ALLOWED_ORIGIN?: string;
  RATE_LIMITER: { limit(o: { key: string }): Promise<{ success: boolean }> };
  USAGE: {
    idFromName(n: string): unknown;
    get(id: unknown): {
      hit(limit: number): Promise<{ allowed: boolean; remaining: number }>;
      peek(limit: number): Promise<number>;
    };
  };
}

const DEFAULT_MODEL = 'claude-haiku-5-5';

function json(data: unknown, status: number, cors: Record<string, string>, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors, ...extra },
  });
}

export async function handle(request: Request, env: Env, callModel: CallModel): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN;

  // Браузерные запросы принимаются только с адреса вашего приложения
  if (origin && origin !== allowed) return json({ error: 'forbidden_origin' }, 403, {});
  const cors: Record<string, string> = origin
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true }, 200, cors);

  // Ограничение частоты по IP — до проверки ключа, чтобы нельзя было подбирать ключ
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const rl = await env.RATE_LIMITER.limit({ key: ip });
  if (!rl.success) return json({ error: 'rate_limited', retryAfter: 20 }, 429, cors, { 'Retry-After': '20' });

  if (!(await checkAccessKey(request.headers.get('Authorization'), env.ACCESS_KEY))) {
    return json({ error: 'unauthorized' }, 401, cors);
  }

  const limit = Math.min(5000, Math.max(1, Number(env.DAILY_LIMIT) || 200));
  const counter = env.USAGE.get(env.USAGE.idFromName('global'));

  // Проверка ключа доступа без обращения к Anthropic (бесплатно)
  if (url.pathname === '/verify') {
    return json({ ok: true, remainingToday: await counter.peek(limit) }, 200, cors);
  }

  if (url.pathname !== '/chat') return json({ error: 'not_found' }, 404, cors);
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413, cors);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413, cors);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_request' }, 400, cors);
  }
  const parsed = parseTurns(body);
  if ('error' in parsed) return json({ error: parsed.error }, parsed.error === 'too_long' ? 413 : 400, cors);

  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503, cors);

  const hit = await counter.hit(limit);
  if (!hit.allowed) return json({ error: 'daily_limit', retryAfter: 3600 }, 429, cors, { 'Retry-After': '3600' });

  const model = env.MODEL && /^claude-[a-z0-9.-]+$/.test(env.MODEL) ? env.MODEL : DEFAULT_MODEL;
  try {
    const r = await callModel({
      apiKey: env.ANTHROPIC_API_KEY,
      model,
      system: buildSystemPrompt(new Date()),
      turns: parsed.turns,
    });
    if (r.refused) return json({ error: 'refused' }, 200, cors);
    if (!r.text) return json({ error: 'empty' }, 502, cors);
    return json({ text: r.text, model, remainingToday: hit.remaining }, 200, cors);
  } catch (e) {
    const kind = e instanceof UpstreamError ? e.kind : 'other';
    const map: Record<UpstreamKind, [number, string]> = {
      rate_limit: [503, 'upstream_busy'],
      auth: [502, 'server_misconfigured'],
      billing: [502, 'billing'],
      timeout: [504, 'upstream_timeout'],
      network: [502, 'upstream_network'],
      other: [502, 'upstream_error'],
    };
    const [status, code] = map[kind];
    return json({ error: code }, status, cors);
  }
}
