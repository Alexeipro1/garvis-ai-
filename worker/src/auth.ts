async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

/** Сравнение за постоянное время (по хэшам одинаковой длины) */
export async function checkAccessKey(header: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret || secret.length < 32) return false; // ключ не настроен или слишком короткий — доступ закрыт
  const match = /^Bearer (.+)$/.exec(header ?? '');
  const [a, b] = await Promise.all([sha256(match?.[1] ?? ''), sha256(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 && match !== null;
}
