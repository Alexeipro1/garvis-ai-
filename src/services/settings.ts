import type { RemoteConfig } from './remoteAssistant';
import type { Message } from '../types';

/**
 * Хранится на устройстве (localStorage): адрес сервера и ключ ДОСТУПА к вашему посреднику.
 * Ключ Anthropic здесь не хранится и приложению не известен.
 */
const CFG_KEY = 'jarvis.remote';
const HISTORY_KEY = 'jarvis.history';
const HISTORY_MAX = 100;

export function loadRemote(): RemoteConfig | null {
  try {
    const v = JSON.parse(localStorage.getItem(CFG_KEY) ?? 'null') as Partial<RemoteConfig> | null;
    return v && typeof v.endpoint === 'string' && typeof v.accessKey === 'string' && v.endpoint && v.accessKey
      ? { endpoint: v.endpoint, accessKey: v.accessKey }
      : null;
  } catch { return null; }
}
export function saveRemote(cfg: RemoteConfig | null) {
  try {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(CFG_KEY);
  } catch { /* ignore */ }
}

export function loadHistory(): Message[] {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as Message[];
    return Array.isArray(v) ? v.filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant')).slice(-HISTORY_MAX) : [];
  } catch { return []; }
}
export function saveHistory(m: Message[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(m.slice(-HISTORY_MAX))); } catch { /* ignore */ }
}
