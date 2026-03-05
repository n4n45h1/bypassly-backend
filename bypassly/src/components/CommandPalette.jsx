import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, Gamepad2, Cog, Trash2, Globe, Bookmark, ExternalLink, Languages, Palette, History } from 'lucide-react';
import { useI18n } from '/src/utils/i18nContext';
import { useOptions } from '/src/utils/optionsContext';
import { themeConfig } from '/src/utils/config';
import { toast } from '/src/utils/toast';

const CommandPalette = memo(({ onOpenBookmarks }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { t, setLang, LANGUAGES } = useI18n();
  const { options, updateOption } = useOptions();


  const allCommands = useMemo(() => [
    {
      id: 'home',
      label: t('cp.cmd.home'),
      icon: Home,
      action: () => navigate('/'),
    },
    {
      id: 'apps',
      label: t('cp.cmd.apps'),
      icon: LayoutGrid,
      action: () => navigate('/materials'),
    },
    {
      id: 'games',
      label: t('cp.cmd.games'),
      icon: Gamepad2,
      action: () => navigate('/docs'),
    },
    {
      id: 'settings',
      label: t('cp.cmd.settings'),
      icon: Cog,
      action: () => navigate('/settings'),
    },
    {
      id: 'history',
      label: t('cp.cmd.history'),
      icon: History,
      action: () => navigate('/history'),
    },
    {
      id: 'clearCache',
      label: t('cp.cmd.clearCache'),
      icon: Trash2,
      action: () => {
        if ('caches' in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
        localStorage.clear();
        sessionStorage.clear();
        toast.success(t('toast.cacheCleared'));
        setTimeout(() => location.reload(), 400);
      },
    },
    {
      id: 'aboutBlank',
      label: t('cp.cmd.aboutBlank'),
      icon: Globe,
      action: () => {
        import('/src/utils/utils.js').then(({ openAboutBlankPopup }) =>
          openAboutBlankPopup(true),
        );
      },
    },
    {
      id: 'bookmarks',
      label: t('cp.cmd.bookmarks'),
      icon: Bookmark,
      action: () => onOpenBookmarks?.(),
    },
    {
      id: 'discord',
      label: t('cp.cmd.discord'),
      icon: ExternalLink,
      action: () => window.open('/ds', '_blank'),
    },
    // Language switch commands
    ...LANGUAGES.map((lang) => ({
      id: `lang-${lang.code}`,
      label: `${t('cp.lang')} ${lang.label}`,
      icon: Languages,
      group: 'lang',
      action: () => {
        setLang(lang.code);
        toast.info(t('toast.langChanged'));
      },
    })),
    // Theme switch commands
    ...themeConfig.map((th) => ({
      id: `theme-${th.value?.themeName}`,
      label: `${t('cp.theme')} ${th.option}`,
      icon: Palette,
      group: 'theme',
      action: () => {
        updateOption(th.value);
        toast.success(t('toast.themeChanged').replace('{name}', th.option));
      },
    })),
  ], [t, navigate, onOpenBookmarks, LANGUAGES, setLang, updateOption]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, allCommands]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
  }, []);

  const run = useCallback(
    (cmd) => {
      close();
      setTimeout(() => cmd.action(), 80);
    },
    [close],
  );


  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);


  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((v) => Math.min(v + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((v) => Math.max(v - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selected]) run(filtered[selected]);
      }
    },
    [filtered, selected, run],
  );

  // reset selection when filter changes
  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  const bg = options.quickModalBgColor || '#252f3e';
  const text = options.siteTextColor || '#a0b0c8';
  const inputBg = options.settingsSearchBar || '#3c475a';
  const hoverBg = options.settingsPanelItemBackgroundColor || '#405a77';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-full max-w-[520px] rounded-xl shadow-2xl overflow-hidden mx-4"
        style={{ background: bg, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('cp.placeholder')}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: text }}
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: text, opacity: 0.5, fontSize: '0.7rem' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <ul className="py-1.5 max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm" style={{ color: text, opacity: 0.4 }}>
              {t('cp.noResults')}
            </li>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              const isActive = i === selected;
              return (
                <li
                  key={cmd.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer mx-1.5 rounded-lg text-sm transition-colors duration-100"
                  style={{
                    background: isActive ? hoverBg : 'transparent',
                    color: text,
                  }}
                  onMouseEnter={() => setSelected(i)}
                  onMouseDown={(e) => { e.preventDefault(); run(cmd); }}
                >
                  <Icon size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
                  {cmd.label}
                </li>
              );
            })
          )}
        </ul>

        {/* Footer hint */}
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs border-t"
          style={{ color: text, opacity: 0.35, borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.65rem' }}>↑↓</kbd>
          <span>Navigate</span>
          <kbd className="px-1.5 py-0.5 rounded ml-1" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.65rem' }}>↵</kbd>
          <span>Select</span>
          <kbd className="px-1.5 py-0.5 rounded ml-1" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.65rem' }}>Ctrl K</kbd>
          <span>Toggle</span>
        </div>
      </div>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';
export default CommandPalette;
