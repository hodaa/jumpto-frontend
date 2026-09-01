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
    <section className="steps" aria-label={t('steps.title')}>
      <h2 className="section-title">{t('steps.title')}</h2>
      <ol className="steps-track">
        {steps.map((step, index) => (
          <li className="step" key={step.title}>
            <span className="step-badge">{index + 1}</span>
            <h3 className="text-center text-lg font-bold text-slate-900">{step.title}</h3>
            <p className="mx-auto mt-1 max-w-[26ch] text-center text-sm leading-relaxed text-slate-500">
              {step.desc}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
