import { DurableObject } from 'cloudflare:workers';

/** Глобальный суточный счётчик запросов (день считается по Asia/Jerusalem). */
export class DailyCounter extends DurableObject {
  async hit(limit: number): Promise<{ allowed: boolean; remaining: number }> {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
    const stored = (await this.ctx.storage.get<{ day: string; n: number }>('c')) ?? { day, n: 0 };
    const state = stored.day === day ? stored : { day, n: 0 };
    if (state.n >= limit) return { allowed: false, remaining: 0 };
    state.n += 1;
    await this.ctx.storage.put('c', state);
    return { allowed: true, remaining: limit - state.n };
  }

  async peek(limit: number): Promise<number> {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
    const s = await this.ctx.storage.get<{ day: string; n: number }>('c');
    return s && s.day === day ? Math.max(0, limit - s.n) : limit;
  }
}
