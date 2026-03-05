import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { useOptions } from '/src/utils/optionsContext';
import { useI18n } from '/src/utils/i18nContext';
import clsx from 'clsx';

/** Count occurrences of `query` in iframe body text */
const countOccurrences = (fr, query) => {
  if (!query || !fr?.contentDocument) return 0;
  try {
    const text = (fr.contentDocument.body?.innerText || '').toLowerCase();
    const q = query.toLowerCase();
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(q, pos)) !== -1) { count++; pos += q.length; }
    return count;
  } catch { return 0; }
};

const FindInPage = memo(() => {
  const { showFind, toggleFind, activeFrameRef } = loaderStore();
  const { options } = useOptions();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [matchIdx, setMatchIdx] = useState(0);
  const inputRef = useRef(null);

  const bg = options.barColor || '#09121e';
  const text = options.siteTextColor || '#a0b0c8';
  const inputBg = options.settingsSearchBar || '#3c475a';

  const doFind = useCallback((q, forward = true) => {
    if (!q || !activeFrameRef?.current?.contentWindow) return;
    try {
      activeFrameRef.current.contentWindow.find(
        q, false, !forward, true, false, false, false
      );
    } catch {}
  }, [activeFrameRef]);

  const handleQueryChange = useCallback((e) => {
    const q = e.target.value;
    setQuery(q);
    if (!q) { setMatchCount(0); setMatchIdx(0); return; }
    const count = countOccurrences(activeFrameRef?.current, q);
    setMatchCount(count);
    setMatchIdx(count > 0 ? 1 : 0);
    if (count > 0) doFind(q, true);
  }, [activeFrameRef, doFind]);

  const next = useCallback(() => {
    if (!query) return;
    doFind(query, true);
    setMatchIdx((i) => (i < matchCount ? i + 1 : 1));
  }, [query, matchCount, doFind]);

  const prev = useCallback(() => {
    if (!query) return;
    doFind(query, false);
    setMatchIdx((i) => (i > 1 ? i - 1 : matchCount));
  }, [query, matchCount, doFind]);

  const close = useCallback(() => {
    setQuery('');
    setMatchCount(0);
    setMatchIdx(0);
    toggleFind();
  }, [toggleFind]);

  // Ctrl+F — toggle (also works when focus is inside iframe? No — can't intercept from parent)
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (!loaderStore.getState().showFind) {
          loaderStore.getState().toggleFind();
        } else {
          inputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && loaderStore.getState().showFind) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => {
    if (showFind) { setTimeout(() => inputRef.current?.focus(), 40); }
    else { setQuery(''); setMatchCount(0); setMatchIdx(0); }
  }, [showFind]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.shiftKey ? prev() : next(); }
  }, [next, prev]);

  if (!showFind) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 border-t"
      style={{ backgroundColor: bg, borderColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}
    >
      <Search size={13} style={{ color: text, opacity: 0.5, flexShrink: 0 }} />

      <div
        className="flex items-center gap-2 px-2 py-1 rounded-md flex-1 max-w-xs"
        style={{ background: inputBg }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder={t('find.placeholder')}
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: text }}
        />
        {query && (
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: text, opacity: matchCount === 0 ? 0.4 : 0.65 }}
          >
            {matchCount === 0 ? t('find.noResults') : `${matchIdx}/${matchCount}`}
          </span>
        )}
      </div>

      <button
        onClick={prev}
        disabled={matchCount === 0}
        className={clsx(
          'p-1 rounded transition-colors',
          matchCount === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer',
        )}
        title="Previous (Shift+Enter)"
      >
        <ChevronUp size={14} style={{ color: text }} />
      </button>

      <button
        onClick={next}
        disabled={matchCount === 0}
        className={clsx(
          'p-1 rounded transition-colors',
          matchCount === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer',
        )}
        title="Next (Enter)"
      >
        <ChevronDown size={14} style={{ color: text }} />
      </button>

      <button
        onClick={close}
        className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ml-1"
        title="Close (Esc)"
      >
        <X size={13} style={{ color: text, opacity: 0.6 }} />
      </button>
    </div>
  );
});

FindInPage.displayName = 'FindInPage';
export default FindInPage;
