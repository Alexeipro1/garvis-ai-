/**
 * Подготовка к Apple Shortcuts («Команды»).
 * Запуск команды из PWA: shortcuts://run-shortcut?name=<имя>&input=text&text=<текст>
 * Пока ни одна функция не вызывается автоматически.
 */
export function shortcutUrl(name: string, text?: string): string {
  const params = new URLSearchParams({ name });
  if (text) {
    params.set('input', 'text');
    params.set('text', text);
  }
  return `shortcuts://run-shortcut?${params.toString()}`;
}

export function runShortcut(name: string, text?: string) {
  window.location.href = shortcutUrl(name, text);
}
