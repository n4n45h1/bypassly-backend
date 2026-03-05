import { useOptions } from '../utils/optionsContext';
import { useI18n } from '/src/utils/i18nContext';
import { Bookmark, HeartPlus } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Disc from './Discord';
import clsx from 'clsx';
import BookmarksModal from './Bookmarks';

const Footer = memo(() => {
  const { options } = useOptions();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  const handleDs = useCallback(() => {
    window.open('/ds', '_blank');
  }, []);

  const handleAboutBlank = useCallback(() => {
    import('/src/utils/utils.js').then(({ openAboutBlankPopup }) => openAboutBlankPopup(true));
  }, []);

  return (
    <div className="w-full fixed bottom-0 flex items-end justify-between p-2">
      {options.donationBtn !== false && (
        <a
          href="https://ko-fi.com/I3I81MF4CH"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'flex gap-1 items-center cursor-pointer',
            'hover:-translate-y-0.5 duration-200',
          )}
        >
          <HeartPlus className="w-4" />
          {t('footer.support')}
        </a>
      )}
      <div className="flex gap-2 items-center">
        <div
          className={clsx(
            'flex gap-1 items-center cursor-pointer',
            'hover:-translate-y-0.5 duration-200',
          )}
          onClick={handleAboutBlank}
        >
          {t('footer.aboutBlank')}
        </div>
        <span className="text-gray-500">•</span>
        <div
          className={clsx(
            'flex gap-1 items-center cursor-pointer',
            'hover:-translate-y-0.5 duration-200',
          )}
          onClick={handleDs}
        >
          <Disc className="w-4" fill={options.siteTextColor || '#a0b0c8'} />
          {t('footer.discord')}
        </div>
        <span className="text-gray-500">•</span>
        <div
          className={clsx(
            'flex gap-1 items-center cursor-pointer',
            'hover:-translate-y-0.5 duration-200',
          )}
          onClick={() => setIsBookmarksOpen(true)}
        >
          <Bookmark className="w-4" />
          {t('footer.bookmarks')}
        </div>
        <span className="text-gray-500">•</span>
        <div
          className={clsx(
            'flex gap-1 items-center cursor-pointer',
            'hover:-translate-y-0.5 duration-200',
          )}
          onClick={() => navigate('/credits')}
        >
          {t('footer.credits')}
        </div>
        <span className="text-gray-500">•</span>
        <div
          className={clsx(
            'flex gap-1 items-center cursor-pointer',
            'hover:-translate-y-0.5 duration-200',
          )}
          onClick={() => navigate('/history')}
        >
          {t('footer.history')}
        </div>
      </div>
      <BookmarksModal isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} />
    </div>
  );
});

Footer.displayName = 'Footer';
export default Footer;
