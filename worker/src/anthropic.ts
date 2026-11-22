import Anthropic from '@anthropic-ai/sdk';
import { UpstreamError, type CallModel } from './handler.ts';

export const callAnthropic: CallModel = async ({ apiKey, model, system, turns }) => {
  const client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1024, // ответы короткие; жёсткий потолок расходов на один запрос
      system,
      messages: turns,
      output_config: { effort: 'low' }, // быстрый разговорный режим
    });
    if (res.stop_reason === 'refusal') return { text: '', refused: true };
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return { text, refused: false };
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new UpstreamError('timeout');
    if (e instanceof Anthropic.APIConnectionError) throw new UpstreamError('network');
    if (e instanceof Anthropic.RateLimitError) throw new UpstreamError('rate_limit');
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new UpstreamError('auth');
    }
    if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) {
      throw new UpstreamError('billing');
    }
    throw new UpstreamError('other');
  }
};
