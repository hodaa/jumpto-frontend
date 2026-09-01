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
        <h2 className="section-title animate-fade-in">{t('features.title')}</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((item, index) => (
            <article
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#02c1f7]/30 hover:shadow-xl hover:bg-gradient-to-br hover:from-white hover:to-[#02c1f7]/5 animate-fade-in-up group"
              key={item.title}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#02c1f7]/10 to-[#000520]/10 text-[#02c1f7] group-hover:from-[#02c1f7]/20 group-hover:to-[#000520]/20 transition-all duration-300 group-hover:scale-110">
                {item.icon}
              </span>
              <h3 className="text-base font-bold text-[#01124e]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
