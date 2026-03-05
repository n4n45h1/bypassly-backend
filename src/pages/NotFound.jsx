import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useOptions } from '../utils/optionsContext';
import { useI18n } from '../utils/i18nContext';

const calc = (hex, alpha = 0.5) => {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};

const NotFound = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const { options } = useOptions();
  const { t } = useI18n();
  const mainText = options.siteTextColor ?? '#a0b0c8';

  const colorConfig = {
    text: mainText,
    textMuted: calc(mainText, 0.5),
  };

  useEffect(() => {
    if (loc.pathname.includes('/ham/') || loc.pathname.includes('/portal/k12/')) {
      return;
    }
    nav('/');
  }, [loc, nav]);

  if (loc.pathname.includes('/ham/') || loc.pathname.includes('/portal/k12/')) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ fontFamily: 'SFProText, system-ui, sans-serif' }}
      >
        <h1 className="text-2xl font-medium mb-2" style={{ color: colorConfig.text }}>
          {t('notfound.title')}
        </h1>
        <p
          onClick={() => location.reload()}
          className="cursor-pointer underline"
          style={{ color: colorConfig.textMuted }}
        >
          {t('notfound.refresh')}
        </p>
      </div>
    );
  }

  return null;
};

export default NotFound;
