import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '/src/utils/i18nContext';
import { useOptions } from '/src/utils/optionsContext';
import { toast } from '/src/utils/toast';

const FlagImg = ({ country, size = 20 }) => (
  <img
    src={`https://flagcdn.com/w${size}/${country}.png`}
    srcSet={`https://flagcdn.com/w${size * 2}/${country}.png 2x`}
    width={size}
    height={size * 0.75}
    alt=""
    loading="lazy"
    style={{ borderRadius: '2px', objectFit: 'cover', display: 'block', flexShrink: 0 }}
  />
);

const LangSelector = memo(() => {
  const { lang, setLang, LANGUAGES, t } = useI18n();
  const { options } = useOptions();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  const close = useCallback(() => setOpen(false), []);

  const handleOpen = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inBtn = btnRef.current?.contains(e.target);
      const inDrop = dropRef.current?.contains(e.target);
      if (!inBtn && !inDrop) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const dropdownBg = options.settingsDropdownColor || '#162337';
  const text = options.siteTextColor || '#a0b0c8';
  const hoverBg = options.settingsPanelItemBackgroundColor || '#405a77';

  return (
    <div className="relative select-none" style={{ fontSize: '0.82rem' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 duration-150 px-2 py-1 rounded-lg"
        style={{ color: text, background: open ? 'rgba(255,255,255,0.06)' : 'transparent' }}
        title="Language"
      >
        <FlagImg country={current.country} size={20} />
        <span className="hidden sm:inline">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            background: dropdownBg,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            minWidth: '160px',
            zIndex: 9999,
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs cursor-pointer transition-colors duration-100"
              style={{
                color: text,
                background: l.code === lang ? hoverBg : 'transparent',
                fontWeight: l.code === lang ? 600 : 400,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = l.code === lang ? hoverBg : 'transparent'; }}
              onClick={() => { setLang(l.code); toast.info(t('toast.langChanged')); close(); }}
            >
              <FlagImg country={l.country} size={20} />
              {l.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
});

LangSelector.displayName = 'LangSelector';
export default LangSelector;
