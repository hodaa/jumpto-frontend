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
        <div className="features-grid">
          {items.map((item) => (
            <article className="feature-card" key={item.title}>
              <span className="feature-icon">{item.icon}</span>
              <h3 className="feature-title">{item.title}</h3>
              <p className="feature-desc">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
