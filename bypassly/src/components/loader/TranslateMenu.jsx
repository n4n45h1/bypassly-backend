import { useCallback, memo, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, X, Loader2, RotateCcw, Settings2 } from 'lucide-react';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { useOptions } from '/src/utils/optionsContext';
import { useI18n } from '/src/utils/i18nContext';
import { toast } from '/src/utils/toast';

// Public LibreTranslate instances to try in order (no API key required)
const LIBRE_INSTANCES = [
  'https://translate.argosopentech.com',
  'https://libretranslate.terraprint.co',
  'https://lt.vern.cc',
  'https://translate.astian.org',
];

// LibreTranslate uses 'zh' for Simplified Chinese
const LT_CODE_MAP = { 'zh-CN': 'zh' };
const ltCode = (code) => LT_CODE_MAP[code] || code;

const TRANSLATE_LANGS = [
  { code: 'en',    label: 'English',   country: 'us' },
  { code: 'ja',    label: '日本語',     country: 'jp' },
  { code: 'zh-CN', label: '中文',       country: 'cn' },
  { code: 'ko',    label: '한국어',     country: 'kr' },
  { code: 'es',    label: 'Español',   country: 'es' },
  { code: 'fr',    label: 'Français',  country: 'fr' },
  { code: 'de',    label: 'Deutsch',   country: 'de' },
  { code: 'it',    label: 'Italiano',  country: 'it' },
  { code: 'pt',    label: 'Português', country: 'br' },
  { code: 'ru',    label: 'Русский',   country: 'ru' },
  { code: 'ar',    label: 'العربية',   country: 'sa' },
  { code: 'hi',    label: 'हिन्दी',      country: 'in' },
];

const SKIP_TAGS = new Set(['script','style','noscript','code','pre','textarea','input','select','button']);
const SEP = '\n⸻\n';
const BATCH = 30;

async function libreTranslate(q, target, apiBase) {
  const url = `${apiBase.replace(/\/$/, '')}/translate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, source: 'auto', target, format: 'text' }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.translatedText;
}

async function translateBatches(nodes, targetCode, customApi) {
  const translated = [];
  const instances = customApi ? [customApi, ...LIBRE_INSTANCES] : LIBRE_INSTANCES;

  for (let i = 0; i < nodes.length; i += BATCH) {
    const batch = nodes.slice(i, i + BATCH).map((n) => n.textContent);
    const q = batch.join(SEP);
    let result = null;
    for (const base of instances) {
      try {
        result = await libreTranslate(q, targetCode, base);
        break;
      } catch {
        // try next instance
      }
    }
    if (result === null) throw new Error('All instances failed');
    translated.push(...result.split(SEP));
  }
  return translated;
}

function collectTextNodes(doc) {
  const nodes = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      const tag = node.parentElement?.tagName?.toLowerCase();
      if (SKIP_TAGS.has(tag)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

const Flag = ({ country }) => (
  <img
    src={`https://flagcdn.com/w20/${country}.png`}
    srcSet={`https://flagcdn.com/w40/${country}.png 2x`}
    width="20" height="15" alt="" loading="lazy"
    style={{ borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }}
  />
);

const TranslateMenu = memo(() => {
  const { showTranslate, toggleTranslate, activeFrameRef } = loaderStore();
  const { options } = useOptions();
  const { t } = useI18n();
  const panelRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState(null);
  const originals = useRef(null); // Map<TextNode, originalText>
  const [showApiInput, setShowApiInput] = useState(false);
  const [customApi, setCustomApi] = useState(
    () => localStorage.getItem('bypassly_lt_api') || ''
  );

  const bg = options.quickModalBgColor || '#252f3e';
  const textColor = options.siteTextColor || '#a0b0c8';
  const hoverBg = options.settingsPanelItemBackgroundColor || '#405a77';
  const border = 'rgba(255,255,255,0.08)';

  // Close on outside click
  useEffect(() => {
    if (!showTranslate) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target)) toggleTranslate();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTranslate, toggleTranslate]);

  const saveApi = useCallback((val) => {
    setCustomApi(val);
    localStorage.setItem('bypassly_lt_api', val);
  }, []);

  const restoreOriginal = useCallback(() => {
    if (!originals.current) return;
    for (const [node, text] of originals.current) {
      try { node.textContent = text; } catch {}
    }
    originals.current = null;
    setCurrentLang(null);
    toast.success(t('translate.original'));
  }, [t]);

  const translate = useCallback(async (langCode) => {
    const iframe = activeFrameRef?.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) {
      toast.error(t('translate.noPage'));
      return;
    }

    setLoading(true);
    toggleTranslate();

    try {
      // Restore to original before re-translating
      if (originals.current) {
        for (const [node, text] of originals.current) {
          try { node.textContent = text; } catch {}
        }
      }

      const nodes = collectTextNodes(doc);
      if (!nodes.length) {
        toast.error(t('translate.noPage'));
        setLoading(false);
        return;
      }

      // Snapshot originals on first translation
      if (!originals.current) {
        originals.current = new Map(nodes.map((n) => [n, n.textContent]));
      }

      const translated = await translateBatches(nodes, ltCode(langCode), customApi);
      nodes.forEach((n, i) => {
        if (translated[i] !== undefined) n.textContent = translated[i];
      });
      setCurrentLang(langCode);
      toast.success(t('translate.translating'));
    } catch {
      toast.error(t('translate.error'));
    }
    setLoading(false);
  }, [activeFrameRef, customApi, t, toggleTranslate]);

  if (!showTranslate) return null;

  const currentLangLabel = TRANSLATE_LANGS.find((l) => l.code === currentLang)?.label;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '290px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '12px 0 0 0',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
        zIndex: 9990,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: border }}>
        <Languages size={15} style={{ color: textColor, opacity: 0.7 }} />
        <span className="text-sm font-semibold flex-1" style={{ color: textColor }}>
          {t('translate.title')}
        </span>
        {loading && <Loader2 size={13} className="animate-spin" style={{ color: textColor, opacity: 0.6 }} />}
        <button
          title="LibreTranslate API endpoint"
          onClick={() => setShowApiInput((v) => !v)}
          className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Settings2 size={13} style={{ color: textColor, opacity: showApiInput ? 1 : 0.4 }} />
        </button>
        <button
          onClick={toggleTranslate}
          className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={13} style={{ color: textColor, opacity: 0.5 }} />
        </button>
      </div>

      {/* Custom API endpoint input */}
      {showApiInput && (
        <div className="px-3 py-2 border-b" style={{ borderColor: border }}>
          <p className="text-xs mb-1" style={{ color: textColor, opacity: 0.55 }}>
            LibreTranslate API URL
          </p>
          <input
            type="text"
            value={customApi}
            onChange={(e) => saveApi(e.target.value)}
            placeholder="https://libretranslate.com"
            className="w-full text-xs px-2 py-1 rounded"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${border}`,
              color: textColor,
              outline: 'none',
            }}
          />
          <p className="text-xs mt-1" style={{ color: textColor, opacity: 0.35 }}>
            Blank = auto-try public instances
          </p>
        </div>
      )}

      {/* Current lang indicator */}
      {currentLangLabel && !loading && (
        <div
          className="px-4 py-1.5 text-xs"
          style={{ color: textColor, opacity: 0.55, borderBottom: `1px solid ${border}` }}
        >
          Translated → {currentLangLabel}
        </div>
      )}

      {/* Language grid */}
      <div
        className="p-2 grid grid-cols-2 gap-1"
        style={{ opacity: loading ? 0.4 : 1, pointerEvents: loading ? 'none' : 'auto' }}
      >
        {TRANSLATE_LANGS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => translate(lang.code)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left cursor-pointer transition-colors duration-100"
            style={{ color: textColor }}
            onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Flag country={lang.country} />
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Restore original */}
      {originals.current && (
        <div className="px-3 pb-3">
          <button
            onClick={restoreOriginal}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: textColor, opacity: 0.55, border: `1px solid ${border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
          >
            <RotateCcw size={11} />
            {t('translate.original')}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
});

TranslateMenu.displayName = 'TranslateMenu';
export default TranslateMenu;
