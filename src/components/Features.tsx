import { useTranslation } from 'react-i18next';
import { IconBolt, IconPlay, IconTarget } from './icons';

/** Value-proposition cards shown on the landing page. */
export function Features() {
  const { t } = useTranslation();
  const items = [
    { icon: <IconTarget />, title: t('features.exactTitle'), desc: t('features.exactDesc') },
    { icon: <IconBolt />, title: t('features.fastTitle'), desc: t('features.fastDesc') },
    { icon: <IconPlay />, title: t('features.jumpTitle'), desc: t('features.jumpDesc') },
  ];

  return (
    <section className="features" id="why-jumpto" aria-label={t('features.title')}>
      <div className="features__inner">
        <h2 className="section-title">{t('features.title')}</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <article
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              key={item.title}
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {item.icon}
              </span>
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
