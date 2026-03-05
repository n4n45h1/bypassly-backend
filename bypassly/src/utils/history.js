const KEY = 'bypassly_history';
const MAX = 500;

/**
 * Returns all history entries, newest first.
 * @returns {{ url: string, title: string, ts: number }[]}
 */
export const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Adds (or refreshes) a history entry.
 * Skipped when options.enableHistory === false.
 */
export const addHistory = (url, title, options = {}) => {
  if (options.enableHistory === false) return;
  if (!url || url.startsWith('tabs://') || url === 'about:blank') return;
  try {
    const hist = getHistory();
    const filtered = hist.filter((e) => e.url !== url);
    const entry = { url, title: title || url, ts: Date.now() };
    const next = [entry, ...filtered].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
};

/**
 * Removes a single history entry by URL.
 */
export const removeHistory = (url) => {
  try {
    const hist = getHistory().filter((e) => e.url !== url);
    localStorage.setItem(KEY, JSON.stringify(hist));
  } catch {}
};

/**
 * Clears all history.
 */
export const clearHistory = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};
