export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 2000;
export const MAX_BODY_BYTES = 64 * 1024;

/** Проверяет тело запроса. Возвращает очищенный список реплик или текст ошибки. */
export function parseTurns(body: unknown): { turns: Turn[] } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'bad_request' };
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 100) return { error: 'bad_request' };

  const turns: Turn[] = [];
  for (const m of raw) {
    if (typeof m !== 'object' || m === null) return { error: 'bad_request' };
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return { error: 'bad_request' };
    if (typeof content !== 'string') return { error: 'bad_request' };
    const text = content.trim();
    if (!text) continue;
    if (text.length > MAX_CHARS) return { error: 'too_long' };
    turns.push({ role, content: text });
  }

  const recent = turns.slice(-MAX_MESSAGES);
  while (recent.length && recent[0].role !== 'user') recent.shift(); // диалог должен начинаться с user
  if (recent.length === 0 || recent[recent.length - 1].role !== 'user') return { error: 'bad_request' };
  return { turns: recent };
}
