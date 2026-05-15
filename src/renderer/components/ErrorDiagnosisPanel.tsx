import { diagnoses } from '../../shared/errors';
import type { I18nKey } from '../../shared/i18n';
import { useI18n } from '../i18n';

export function ErrorDiagnosisPanel({ onOpenLogs }: { onOpenLogs?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="diagnosis-grid">
      {diagnoses.map((item) => {
        const title = t(item.titleKey as I18nKey);
        const reason = t(item.reasonKey as I18nKey);
        return (
          <article className="diagnosis-item" key={item.code}>
            <div className="diagnosis-code">{item.code}</div>
            <div>
              <h4>{title}</h4>
              <p>{reason}</p>
              <details>
                <summary>{t('diagnosis.summary')}</summary>
                <ul>
                  {item.suggestionKeys.map((suggestionKey) => (
                    <li key={suggestionKey}>{t(suggestionKey as I18nKey)}</li>
                  ))}
                </ul>
              </details>
              <div className="diagnosis-actions">
                <button type="button" onClick={() => void navigator.clipboard?.writeText(`${item.code} ${title}\n${reason}`)}>
                  {t('diagnosis.copyError')}
                </button>
                <button type="button" onClick={onOpenLogs}>
                  {t('diagnosis.openLogs')}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
