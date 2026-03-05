import { useNavigate } from 'react-router-dom';
import NavItem from '../components/NavItem';
import { LayoutGrid, Gamepad2, Cog } from 'lucide-react';
import { useOptions } from '/src/utils/optionsContext';
import { useI18n } from '/src/utils/i18nContext';
import pkg from '../../package.json';
import nav from '../styles/nav.module.css';
import theme from '../styles/theming.module.css';
import clsx from 'clsx';
import Logo from '../components/Logo';
import LangSelector from '../components/LangSelector';
import { memo, useMemo, useCallback } from 'react';

const version = pkg.version;
const itemSize = 16;

const navItems = [
  { name: 'Apps', id: 'btn-a', type: LayoutGrid, route: '/materials' },
  { name: 'Games', id: 'btn-g', type: Gamepad2, route: '/docs' },
  { name: 'Settings', id: 'btn-s', type: Cog, route: '/settings' },
];

const Nav = memo(() => {
  const navigate = useNavigate();
  const { options } = useOptions();
  const { t } = useI18n();

  const scale = Number(options.navScale || 1);
  const dimensions = useMemo(
    () => ({
      navHeight: Math.round(69 * scale),
      logoWidth: Math.round(122 * scale),
      logoHeight: Math.round(41 * scale),
      versionFont: Math.round(9 * scale),
      versionMargin: Math.round(-10 * scale),
    }),
    [scale],
  );

  const handleLogoClick = useCallback(() => navigate('/'), [navigate]);

  const items = useMemo(
    () => [
      { name: t('nav.apps'), id: 'btn-a', type: LayoutGrid, route: '/materials', size: itemSize, onClick: () => navigate('/materials') },
      { name: t('nav.games'), id: 'btn-g', type: Gamepad2, route: '/docs', size: itemSize, onClick: () => navigate('/docs') },
      { name: t('nav.settings'), id: 'btn-s', type: Cog, route: '/settings', size: itemSize, onClick: () => navigate('/settings') },
    ],
    [t, navigate],
  );

  return (
    <div
      className={clsx(
        nav.nav,
        theme['nav-backgroundColor'],
        theme[`theme-${options.theme || 'default'}`],
        ' w-full shadow-x1/20 flex items-center pl-6 pr-5 gap-5 z-50',
      )}
      style={{ height: `${dimensions.navHeight}px` }}
    >
      <Logo width={dimensions.logoWidth} height={dimensions.logoHeight} action={handleLogoClick} />
      <div
        className="border rounded-full text-center"
        style={{
          fontSize: `${dimensions.versionFont}px`,
          marginLeft: `${dimensions.versionMargin}px`,
          paddingLeft: '0.3rem',
          paddingRight: '0.3rem',
        }}
      >
        {isStaticBuild ? 'Static Version' : 'v' + version}
      </div>
      <div className="flex items-center gap-5 ml-auto" style={{ height: 'calc(100% - 0.5rem)' }}>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer hover:opacity-70 duration-150"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: options.siteTextColor || '#a0b0c8', opacity: 0.55 }}
          title="Command Palette (Ctrl+K)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span className="hidden md:inline">Ctrl K</span>
        </button>
        <NavItem items={items} />
        <LangSelector />
      </div>
    </div>
  );
});

Nav.displayName = 'Nav';
export default Nav;
