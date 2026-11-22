import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, UpstreamError, type Env, type CallModel } from '../src/handler.ts';

const KEY = 'k'.repeat(40);
const ORIGIN = 'https://alexeipro1.github.io';

function makeEnv(over: Partial<Env> = {}, opts: { rlAllow?: () => boolean; daily?: number } = {}): Env {
  let n = 0;
  const daily = opts.daily ?? 200;
  return {
    ANTHROPIC_API_KEY: 'sk-test',
    ACCESS_KEY: KEY,
    ALLOWED_ORIGIN: ORIGIN,
    DAILY_LIMIT: String(daily),
    RATE_LIMITER: { limit: async () => ({ success: opts.rlAllow ? opts.rlAllow() : true }) },
    USAGE: {
      idFromName: (x) => x,
      get: () => ({
        hit: async (l: number) => (n >= l ? { allowed: false, remaining: 0 } : { allowed: true, remaining: l - ++n }),
        peek: async (l: number) => l - n,
      }),
    },
    ...over,
  };
}
const ok: CallModel = async () => ({ text: 'Здравствуйте, Алексей.', refused: false });
const req = (path: string, init: RequestInit & { auth?: string | null } = {}) => {
  const { auth, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set('Origin', ORIGIN);
  if (auth !== null) headers.set('Authorization', `Bearer ${auth ?? KEY}`);
  return new Request('https://api.example.workers.dev' + path, { ...rest, headers });
};
const chat = (messages: unknown, extra: RequestInit & { auth?: string | null } = {}) =>
  req('/chat', { method: 'POST', body: JSON.stringify({ messages }), ...extra });
const hi = [{ role: 'user', content: 'Привет' }];

test('health открыт и не раскрывает данных', async () => {
  const r = await handle(req('/health', { auth: null }), makeEnv(), ok);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test('без ключа доступа — 401, с неверным — 401', async () => {
  assert.equal((await handle(chat(hi, { auth: null }), makeEnv(), ok)).status, 401);
  assert.equal((await handle(chat(hi, { auth: 'x'.repeat(40) }), makeEnv(), ok)).status, 401);
});

test('ACCESS_KEY не настроен или короткий — доступ закрыт', async () => {
  assert.equal((await handle(chat(hi), makeEnv({ ACCESS_KEY: undefined }), ok)).status, 401);
  assert.equal((await handle(chat(hi, { auth: 'short' }), makeEnv({ ACCESS_KEY: 'short' }), ok)).status, 401);
});

test('чужой Origin — 403 без CORS-заголовков', async () => {
  const r = await handle(new Request('https://x/chat', { method: 'POST', headers: { Origin: 'https://evil.example', Authorization: `Bearer ${KEY}` }, body: '{}' }), makeEnv(), ok);
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
});

test('preflight OPTIONS и CORS только для своего адреса', async () => {
  const r = await handle(req('/chat', { method: 'OPTIONS', auth: null }), makeEnv(), ok);
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('успешный чат', async () => {
  const r = await handle(chat(hi), makeEnv(), ok);
  assert.equal(r.status, 200);
  const j = (await r.json()) as { text: string; remainingToday: number };
  assert.equal(j.text, 'Здравствуйте, Алексей.');
  assert.equal(j.remainingToday, 199);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
});

test('системный промпт, модель и история задаются/очищаются на сервере', async () => {
  let seen: Parameters<CallModel>[0] | undefined;
  const spy: CallModel = async (a) => { seen = a; return { text: 'ок', refused: false }; };
  const msgs = [
    { role: 'assistant', content: 'лишнее начало' },
    { role: 'user', content: 'один' },
    { role: 'assistant', content: 'два' },
    { role: 'user', content: 'три' },
  ];
  const r = await handle(req('/chat', { method: 'POST', body: JSON.stringify({ messages: msgs, system: 'взлом', model: 'claude-opus-5-5' }) }), makeEnv({ MODEL: 'claude-haiku-5-5' }), spy);
  assert.equal(r.status, 200);
  assert.equal(seen!.model, 'claude-haiku-5-5');
  assert.ok(seen!.system.includes('J.A.R.V.I.S.') && seen!.system.includes('Алексей') && !seen!.system.includes('взлом'));
  assert.equal(seen!.turns[0].role, 'user');
  assert.equal(seen!.turns.length, 3);
});

test('некорректная MODEL заменяется значением по умолчанию', async () => {
  let m = '';
  await handle(chat(hi), makeEnv({ MODEL: 'evil model; drop' }), async (a) => { m = a.model; return { text: 'x', refused: false }; });
  assert.equal(m, 'claude-haiku-5-5');
});

test('валидация: роли, пустой список, длина, последний — user', async () => {
  const e = makeEnv();
  assert.equal((await handle(chat([]), e, ok)).status, 400);
  assert.equal((await handle(chat([{ role: 'system', content: 'x' }]), e, ok)).status, 400);
  assert.equal((await handle(chat([{ role: 'user', content: 'a'.repeat(2001) }]), e, ok)).status, 413);
  assert.equal((await handle(chat([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]), e, ok)).status, 400);
  assert.equal((await handle(req('/chat', { method: 'POST', body: '{not json' }), e, ok)).status, 400);
});

test('история обрезается до последних 20 сообщений', async () => {
  let n = 0;
  const msgs = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  msgs.push({ role: 'user', content: 'последний' });
  await handle(chat(msgs), makeEnv(), async (a) => { n = a.turns.length; return { text: 'x', refused: false }; });
  assert.ok(n <= 20 && n >= 19);
});

test('лимит частоты — 429 до проверки ключа', async () => {
  const r = await handle(chat(hi, { auth: 'wrong' }), makeEnv({}, { rlAllow: () => false }), ok);
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '20');
});

test('суточный лимит — 429 daily_limit', async () => {
  const env = makeEnv({}, { daily: 2 });
  assert.equal((await handle(chat(hi), env, ok)).status, 200);
  assert.equal((await handle(chat(hi), env, ok)).status, 200);
  const r = await handle(chat(hi), env, ok);
  assert.equal(r.status, 429);
  assert.equal(((await r.json()) as { error: string }).error, 'daily_limit');
});

test('/verify проверяет ключ и не расходует лимит', async () => {
  const env = makeEnv({}, { daily: 5 });
  const r = await handle(req('/verify'), env, ok);
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as { remainingToday: number }).remainingToday, 5);
  assert.equal((await handle(req('/verify', { auth: 'bad' }), env, ok)).status, 401);
});

test('ошибки Anthropic не раскрывают детали', async () => {
  const cases: [string, number, string][] = [
    ['rate_limit', 503, 'upstream_busy'], ['auth', 502, 'server_misconfigured'], ['billing', 502, 'billing'],
    ['timeout', 504, 'upstream_timeout'], ['network', 502, 'upstream_network'], ['other', 502, 'upstream_error'],
  ];
  for (const [kind, status, code] of cases) {
    const r = await handle(chat(hi), makeEnv(), async () => { throw new UpstreamError(kind as never); });
    assert.equal(r.status, status);
    assert.equal(((await r.json()) as { error: string }).error, code);
  }
  const r = await handle(chat(hi), makeEnv(), async () => { throw new Error('sk-test секрет'); });
  assert.ok(!(await r.text()).includes('sk-test'));
});

test('нет ключа Anthropic — 503; отказ модели — refused', async () => {
  assert.equal((await handle(chat(hi), makeEnv({ ANTHROPIC_API_KEY: undefined }), ok)).status, 503);
  const r = await handle(chat(hi), makeEnv(), async () => ({ text: '', refused: true }));
  assert.equal(((await r.json()) as { error: string }).error, 'refused');
});

test('слишком большое тело — 413', async () => {
  const r = await handle(req('/chat', { method: 'POST', body: 'x'.repeat(70000) }), makeEnv(), ok);
  assert.equal(r.status, 413);
});
