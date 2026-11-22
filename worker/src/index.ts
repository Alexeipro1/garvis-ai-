import { callAnthropic } from './anthropic.ts';
import { handle, type Env } from './handler.ts';

export { DailyCounter } from './counter.ts';

export default {
  fetch: (request: Request, env: Env) => handle(request, env, callAnthropic),
};
