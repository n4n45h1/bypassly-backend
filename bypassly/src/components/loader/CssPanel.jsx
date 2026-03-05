import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Code2, X, RotateCcw, Check } from 'lucide-react';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { useOptions } from '/src/utils/optionsContext';
import { useI18n } from '/src/utils/i18nContext';
import { toast } from '/src/utils/toast';

export const CSS_KEY = 'bypassly_custom_css';

/** Apply stored CSS to an iframe — called by Viewer on load */
export const applyCustomCss = (iframe) => {
  try {
    const css = localStorage.getItem(CSS_KEY);
    if (!css || !iframe?.contentDocument) return;
    const doc = iframe.contentDocument;
    let style = doc.getElementById('bypassly-custom-css');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'bypassly-custom-css';
      (doc.head || doc.documentElement)?.appendChild(style);
    }
    style.textContent = css;
  } catch {}
};

const CSS_PLACEHOLDER = `/* Custom CSS injected into every proxied page */
/* Example: hide ads */
[data-ad], .ad-banner, #banner-ad { display: none !important; }`;

const CssPanel = memo(() => {
  const { showCss, toggleCss, activeFrameRef } = loaderStore();
  const { options } = useOptions();
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);

  const bg = options.settingsContainerColor || '#18283e';
  const panelBg = options.quickModalBgColor || '#252f3e';
  const textColor = options.siteTextColor || '#a0b0c8';
  const inputBg = options.settingsSearchBar || '#3c475a';
  const border = 'rgba(255,255,255,0.08)';

  useEffect(() => {
    if (showCss) {
      setValue(localStorage.getItem(CSS_KEY) || '');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [showCss]);

  const apply = useCallback(() => {
    localStorage.setItem(CSS_KEY, value);
    applyCustomCss(activeFrameRef?.current);
    setSaved(true);
    toast.success(t('css.applied'));
    setTimeout(() => setSaved(false), 1800);
  }, [value, activeFrameRef, t]);

  const reset = useCallback(() => {
    setValue('');
    localStorage.removeItem(CSS_KEY);
    // Remove injected style from active iframe
    try {
      activeFrameRef?.current?.contentDocument
        ?.getElementById('bypassly-custom-css')?.remove();
    } catch {}
    toast.info(t('css.reset'));
  }, [activeFrameRef, t]);

  const handleKeyDown = useCallback((e) => {
    // Tab → indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const next = value.substring(0, start) + '  ' + value.substring(end);
      setValue(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
    // Ctrl+S to apply
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      apply();
    }
    // Escape to close
    if (e.key === 'Escape') toggleCss();
  }, [value, apply, toggleCss]);

  if (!showCss) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[180] flex justify-end"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && toggleCss()}
    >
      <div
        className="flex flex-col w-[360px] h-full shadow-2xl"
        style={{ background: panelBg, borderLeft: `1px solid ${border}` }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: border }}
        >
          <Code2 size={16} style={{ color: textColor, opacity: 0.7 }} />
          <span className="text-sm font-semibold flex-1" style={{ color: textColor }}>
            {t('css.title')}
          </span>
          <button
            onClick={toggleCss}
            className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={14} style={{ color: textColor, opacity: 0.6 }} />
          </button>
        </div>

        {/* Description */}
        <p className="px-4 pt-3 pb-1 text-xs" style={{ color: textColor, opacity: 0.5 }}>
          {t('css.desc')}
        </p>

        {/* Textarea */}
        <div className="flex-1 px-4 py-2 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={CSS_PLACEHOLDER}
            spellCheck={false}
            className="w-full h-full resize-none rounded-lg p-3 text-xs font-mono outline-none"
            style={{
              background: inputBg,
              color: textColor,
              border: `1px solid ${border}`,
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
          style={{ borderColor: border }}
        >
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-white/10 transition-colors"
            style={{ color: textColor, border: `1px solid ${border}` }}
          >
            <RotateCcw size={12} />
            {t('css.reset')}
          </button>

          <button
            onClick={apply}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ml-auto"
            style={{
              background: saved ? '#4ade8033' : options.switchEnabledColor || '#4c6c91',
              color: '#fff',
              border: `1px solid ${saved ? '#4ade80' : 'transparent'}`,
            }}
          >
            {saved ? <Check size={12} /> : <Code2 size={12} />}
            {saved ? t('css.saved') : t('css.apply')}
          </button>
        </div>

        <p className="px-4 pb-3 text-xs text-center" style={{ color: textColor, opacity: 0.3 }}>
          Ctrl+S {t('css.applyShortcut')}
        </p>
      </div>
    </div>,
    document.body,
  );
});

CssPanel.displayName = 'CssPanel';
export default CssPanel;
