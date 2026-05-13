import { diagnoses } from '../../shared/errors';

export function ErrorDiagnosisPanel() {
  return (
    <div className="diagnosis-grid">
      {diagnoses.map((item) => (
        <article className="diagnosis-item" key={item.code}>
          <div className="diagnosis-code">{item.code}</div>
          <div>
            <h4>{item.title}</h4>
            <p>{item.reason}</p>
            <details>
              <summary>修复建议</summary>
              <ul>
                {item.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </details>
            <div className="diagnosis-actions">
              <button type="button">复制错误</button>
              <button type="button">打开日志</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
