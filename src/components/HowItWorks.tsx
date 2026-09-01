import { useTranslation } from 'react-i18next';

/** Three-step "how it works" strip for the landing page. */
export function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { title: t('steps.step1Title'), desc: t('steps.step1Desc') },
    { title: t('steps.step2Title'), desc: t('steps.step2Desc') },
    { title: t('steps.step3Title'), desc: t('steps.step3Desc') },
  ];

  return (
    <section className="steps" id="how-it-works" aria-label={t('steps.title')}>
      <h2 className="section-title animate-fade-in">{t('steps.title')}</h2>
      <ol className="steps-track">
        {steps.map((step, index) => (
          <li className="step animate-fade-in-up" key={step.title} style={{ animationDelay: `${index * 0.15}s` }}>
            <span className="step-badge" aria-label={`Step ${index + 1}`}>
              <span className="step-badge__number">{index + 1}</span>
            </span>
            <h3 className="text-center text-lg font-bold text-[#01124e]">{step.title}</h3>
            <p className="mx-auto mt-2 max-w-[26ch] text-center text-sm leading-relaxed text-slate-600">
              {step.desc}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
