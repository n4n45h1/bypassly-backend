import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../layouts/Nav';
import { useI18n } from '/src/utils/i18nContext';
import { useOptions } from '/src/utils/optionsContext';
import { getHistory, removeHistory, clearHistory } from '/src/utils/history';
import { process } from '/src/utils/hooks/loader/utils';
import { Search, X, Trash2, ExternalLink, Clock } from 'lucide-react';
import clsx from 'clsx';

const ONE_DAY = 86400000;

const getGroup = (ts) => {
  const now = Date.now();
  const diff = now - ts;
  if (diff < ONE_DAY) return 'today';
  if (diff < 2 * ONE_DAY) return 'yesterday';
  if (diff < 7 * ONE_DAY) return 'thisWeek';
  return 'older';
};

const GROUP_ORDER = ['today', 'yesterday', 'thisWeek', 'older'];

const formatTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const HistoryEntry = memo(({ entry, onRemove, onOpen }) => {
  const { options } = useOptions();
  let displayUrl = entry.url;
  try {
    displayUrl = process(entry.url, true, options.prType || 'auto', options.engine || undefined);
  } catch {}

  return (
    <div
      className={clsx(
        'group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer',
        'hover:bg-white/5 duration-100',
      )}
      onClick={() => onOpen(entry.url)}
    >
      <Clock className="w-3.5 h-3.5 opacity-30 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{entry.title || displayUrl}</div>
        <div className="text-xs opacity-40 truncate mt-0.5">{displayUrl}</div>
      </div>
      <span className="text-xs opacity-30 shrink-0 hidden group-hover:block">
        {formatTime(entry.ts)}
      </span>
      <span className="text-xs opacity-30 shrink-0 group-hover:hidden">
        {formatTime(entry.ts)}
      </span>
      <button
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0 duration-100 p-1 rounded"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(entry.url);
        }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30 shrink-0 duration-100" />
    </div>
  );
});
HistoryEntry.displayName = 'HistoryEntry';

const History = () => {
  const { t } = useI18n();
  const { options } = useOptions();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');

  const load = useCallback(() => setEntries(getHistory()), []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
      (e) => e.title?.toLowerCase().includes(q) || e.url?.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const grouped = useMemo(() => {
    const groups = {};
    GROUP_ORDER.forEach((g) => { groups[g] = []; });
    filtered.forEach((e) => groups[getGroup(e.ts)].push(e));
    return groups;
  }, [filtered]);

  const handleRemove = useCallback((url) => {
    removeHistory(url);
    load();
  }, [load]);

  const handleClearAll = useCallback(() => {
    clearHistory();
    load();
  }, [load]);

  const handleOpen = useCallback((url) => {
    navigate('/search', { state: { url } });
  }, [navigate]);

  const groupLabels = {
    today: t('hist.today'),
    yesterday: t('hist.yesterday'),
    thisWeek: t('hist.thisWeek'),
    older: t('hist.older'),
  };

  const hasEntries = filtered.length > 0;

  if (options.enableHistory === false) {
    return (
      <div className="min-h-screen pb-20">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center opacity-40 text-sm">
          {t('hist.disabled')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold">{t('hist.title')}</h1>
          {entries.length > 0 && (
            <button
              className="flex items-center gap-1.5 text-xs opacity-40 hover:opacity-80 duration-150"
              onClick={handleClearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('hist.clearAll')}
            </button>
          )}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 mb-6"
          style={{ backgroundColor: options.omninputColor || '#06080d8f' }}
        >
          <Search className="w-4 h-4 opacity-40 shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder={t('hist.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="opacity-40 hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Entries */}
        {!hasEntries ? (
          <div className="text-center text-sm opacity-30 mt-16">
            {query ? t('hist.noResults') : t('hist.empty')}
          </div>
        ) : (
          GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items.length) return null;
            return (
              <div key={group} className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest opacity-30 mb-2 px-1">
                  {groupLabels[group]}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden p-1">
                  {items.map((entry) => (
                    <HistoryEntry
                      key={entry.url + entry.ts}
                      entry={entry}
                      onRemove={handleRemove}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default History;
