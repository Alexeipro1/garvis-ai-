import { useState } from 'react';
import { normalizeEndpoint, verifyRemote, type RemoteConfig } from '../services/remoteAssistant';
import { ChatError } from '../services/assistant';

interface Props {
  cfg: RemoteConfig | null;
  onCfg: (c: RemoteConfig | null) => void;
}

/** Подключение к серверу-посреднику. Ключ Anthropic здесь не вводится — только адрес и ваш ключ доступа. */
export function RemoteSettings({ cfg, onCfg }: Props) {
  const [endpoint, setEndpoint] = useState(cfg?.endpoint ?? '');
  const [key, setKey] = useState(cfg?.accessKey ?? '');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const build = (): RemoteConfig | null => {
    const ep = normalizeEndpoint(endpoint);
    if (!ep) { setNote({ ok: false, text: 'Адрес должен начинаться с https://' }); return null; }
    if (key.trim().length < 32) { setNote({ ok: false, text: 'Ключ доступа слишком короткий (нужно не менее 32 символов).' }); return null; }
    return { endpoint: ep, accessKey: key.trim() };
  };

  const connect = async () => {
    const c = build();
    if (!c) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await verifyRemote(c);
      onCfg(c);
      setEndpoint(c.endpoint);
      setNote({ ok: true, text: `Подключено. Запросов на сегодня осталось: ${r.remainingToday}. Ответы теперь будут от настоящей модели.` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof ChatError ? e.message : 'Не удалось проверить подключение.' });
    } finally {
      setBusy(false);
    }
  };

  /** Случайный ключ создаётся на устройстве (crypto.getRandomValues), нигде не передаётся */
  const generate = async () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(40));
    const k = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    setKey(k);
    let copied = false;
    try { await navigator.clipboard.writeText(k); copied = true; } catch { /* ignore */ }
    setNote({
      ok: true,
      text: copied
        ? 'Ключ создан и скопирован в буфер. Вставьте его в Cloudflare как секрет ACCESS_KEY, затем нажмите «Проверить и подключить».'
        : 'Ключ создан. Нажмите «Показать ключ», скопируйте его и вставьте в Cloudflare как секрет ACCESS_KEY.',
    });
  };

  const disconnect = () => {
    onCfg(null);
    setKey('');
    setNote({ ok: true, text: 'Отключено. Ключ удалён с этого устройства, ассистент вернулся в демо-режим.' });
  };

  return (
    <section className="card">
      <header className="card__head"><h3>Подключение модели</h3><span className="badge">{cfg ? 'AI' : 'демо'}</span></header>
      <p className="muted" style={{ marginTop: 0 }}>
        Введите адрес вашего сервера-посредника и ключ доступа. Ключ Anthropic сюда вводить не нужно и нельзя: он хранится только на сервере.
      </p>
      <label className="field">Адрес сервера
        <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://jarvis-api.….workers.dev" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <label className="field">Ключ доступа
        <input value={key} onChange={(e) => setKey(e.target.value)} type={show ? 'text' : 'password'} placeholder="Ваш личный ключ (32+ символов)" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <div className="row">
        <button type="button" className="chip" onClick={() => setShow((v) => !v)}>{show ? 'Скрыть ключ' : 'Показать ключ'}</button>
        <button type="button" className="chip chip--primary" onClick={() => void connect()} disabled={busy}>{busy ? 'Проверяю…' : 'Проверить и подключить'}</button>
        <button type="button" className="chip" onClick={() => void generate()}>Сгенерировать ключ доступа</button>
        {cfg && <button type="button" className="chip" onClick={disconnect}>Отключить</button>}
      </div>
      {note && <p className={`muted ${note.ok ? 'note--ok' : 'note--err'}`} role="status">{note.text}</p>}
      <p className="muted">Ключ доступа хранится только на этом устройстве. Если потеряете телефон или ключ — замените ACCESS_KEY в Cloudflare.</p>
    </section>
  );
}
