import { GlobeX } from 'lucide-react';
import { useI18n } from '/src/utils/i18nContext';

export default function StaticError() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2">
      <GlobeX size={32} />
      <p className="text-xl">{t('error.title')}</p>
      <div className="text-center mt-1">
        <p>{t('error.body')}</p>
        <p className="text-xs">
          {t('error.hint')}
        </p>
      </div>
    </div>
  );
}
