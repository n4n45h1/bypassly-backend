import { memo } from 'react';
import Nav from '../layouts/Nav';
import { useI18n } from '/src/utils/i18nContext';
import { ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const AUTHOR = {
  name: 'Kwish',
  icon: '/icon_kwish.png',
  role: 'Developer',
  github: 'https://github.com/kw1sh',
};

const BASE = {
  name: 'dogeub',
  url: 'https://github.com/DogeNetwork/dogeub',
  author: 'DogeNetwork',
  license: 'AGPL-3.0',
};

const LIBS = [
  {
    category: 'Frontend',
    items: [
      { name: 'React', url: 'https://react.dev', license: 'MIT', desc: 'UI framework' },
      { name: 'Vite', url: 'https://vitejs.dev', license: 'MIT', desc: 'Build tool' },
      { name: 'Tailwind CSS', url: 'https://tailwindcss.com', license: 'MIT', desc: 'Utility-first CSS framework' },
      { name: 'Zustand', url: 'https://github.com/pmndrs/zustand', license: 'MIT', desc: 'State management' },
      { name: 'React Router', url: 'https://reactrouter.com', license: 'MIT', desc: 'Client-side routing' },
      { name: 'Lucide React', url: 'https://lucide.dev', license: 'ISC', desc: 'Icon library' },
      { name: 'Headless UI', url: 'https://headlessui.com', license: 'MIT', desc: 'Accessible UI components' },
      { name: 'MUI', url: 'https://mui.com', license: 'MIT', desc: 'Material UI components' },
      { name: 'Emotion', url: 'https://emotion.sh', license: 'MIT', desc: 'CSS-in-JS styling' },
      { name: 'clsx', url: 'https://github.com/lukeed/clsx', license: 'MIT', desc: 'Class name utility' },
      { name: 'movement.css', url: 'https://github.com/codaworks/movement.css', license: 'MIT', desc: 'CSS animations' },
      { name: 'basecoat-css', url: 'https://github.com/hunvreus/basecoat', license: 'MIT', desc: 'Base CSS utilities' },
      { name: 'NProgress', url: 'https://ricostacruz.com/nprogress/', license: 'MIT', desc: 'Progress bar' },
    ],
  },
  {
    category: 'Proxy Engine',
    items: [
      { name: 'Ultraviolet', url: 'https://github.com/titaniumnetwork-dev/Ultraviolet', license: 'AGPL-3.0', desc: 'Web proxy service worker' },
      { name: 'Scramjet', url: 'https://github.com/MercuryWorkshop/scramjet', license: 'AGPL-3.0', desc: 'Alternative proxy engine' },
      { name: 'bare-mux', url: 'https://github.com/MercuryWorkshop/bare-mux', license: 'AGPL-3.0', desc: 'Transport multiplexer' },
      { name: 'libcurl-transport', url: 'https://github.com/MercuryWorkshop/libcurl-transport', license: 'AGPL-3.0', desc: 'HTTP transport layer' },
      { name: 'wisp-js', url: 'https://github.com/MercuryWorkshop/wisp-js', license: 'AGPL-3.0', desc: 'Wisp WebSocket transport' },
      { name: 'Bare Server Node', url: 'https://github.com/nickorlow/bare-server-node', license: 'MIT', desc: 'Bare HTTP proxy server' },
    ],
  },
  {
    category: 'Backend',
    items: [
      { name: 'Fastify', url: 'https://fastify.dev', license: 'MIT', desc: 'Fast Node.js web server' },
      { name: 'dotenv', url: 'https://github.com/motdotla/dotenv', license: 'BSD-2-Clause', desc: 'Environment variables' },
      { name: 'node-fetch', url: 'https://github.com/node-fetch/node-fetch', license: 'MIT', desc: 'HTTP client' },
      { name: 'cookie-parser', url: 'https://github.com/expressjs/cookie-parser', license: 'MIT', desc: 'Cookie middleware' },
    ],
  },
  {
    category: 'Utilities',
    items: [
      { name: 'react-ga4', url: 'https://github.com/codler/react-ga4', license: 'MIT', desc: 'Google Analytics 4' },
      { name: 'jszip', url: 'https://stuk.github.io/jszip/', license: 'MIT/GPLv3', desc: 'ZIP file handling' },
    ],
  },
];

const licenseColor = (license) => {
  if (license.includes('AGPL')) return 'text-amber-400';
  if (license.includes('MIT')) return 'text-emerald-400';
  return 'text-sky-400';
};

const LibItem = memo(({ name, url, license, desc }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={clsx(
      'flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg',
      'hover:bg-white/5 duration-150 group cursor-pointer',
    )}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-sm">{name}</span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 duration-150 shrink-0" />
      </div>
      <p className="text-xs opacity-50 mt-0.5 truncate">{desc}</p>
    </div>
    <span className={clsx('text-xs font-mono shrink-0 mt-0.5', licenseColor(license))}>
      {license}
    </span>
  </a>
));
LibItem.displayName = 'LibItem';

const Credits = memo(() => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen pb-20">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 pt-10">

        {/* Header */}
        <h1 className="text-2xl font-bold mb-1">{t('credits.title')}</h1>
        <p className="text-sm opacity-50 mb-8">{t('credits.subtitle')}</p>

        {/* Author card */}
        <div
          className={clsx(
            'flex items-center gap-5 p-5 rounded-2xl mb-5',
            'border border-white/10 bg-white/[0.03]',
          )}
        >
          <img
            src={AUTHOR.icon}
            alt={AUTHOR.name}
            className="w-16 h-16 rounded-full object-cover border border-white/10"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <div className="text-xl font-bold">{AUTHOR.name}</div>
            <div className="text-sm opacity-50">{t('credits.authorRole')}</div>
            <a
              href={AUTHOR.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs opacity-40 hover:opacity-70 duration-150 mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              {AUTHOR.github.replace('https://', '')}
            </a>
          </div>
        </div>

        {/* Based on */}
        <div
          className={clsx(
            'flex items-center gap-4 p-4 rounded-xl mb-8',
            'border border-amber-500/20 bg-amber-500/5',
          )}
        >
          <div className="text-amber-400 text-xl">⑂</div>
          <div className="flex-1 text-sm">
            <span className="opacity-60">{t('credits.basedOn')} </span>
            <a
              href={BASE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline inline-flex items-center gap-1"
            >
              {BASE.name}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
            <span className="opacity-60"> by {BASE.author}</span>
          </div>
          <span className="text-xs font-mono text-amber-400">{BASE.license}</span>
        </div>

        {/* Libraries */}
        <h2 className="text-sm font-semibold uppercase tracking-widest opacity-40 mb-4">
          {t('credits.libraries')}
        </h2>
        <div className="flex flex-col gap-4">
          {LIBS.map(({ category, items }) => (
            <div
              key={category}
              className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-40">
                  {category}
                </span>
              </div>
              <div className="p-2">
                {items.map((lib) => (
                  <LibItem key={lib.name} {...lib} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs opacity-25 mt-10">
          bypassly — {t('credits.footer')}
        </p>
      </div>
    </div>
  );
});

Credits.displayName = 'Credits';
export default Credits;
