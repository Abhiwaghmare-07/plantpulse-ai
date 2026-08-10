import { useState } from 'react';
import './ManualTest.css';
import api from '../../services/api';
import WhyExplanation from '../../components/WhyExplanation/WhyExplanation';


// ── Preset definitions (values verified against live ML model) ─────────────────
const PRESETS = {
  healthy: {
    label: 'Load Healthy Example',
    icon:  '🟢',
    description: 'Normal operating conditions — all sensors within baseline ranges.',
    values: {
      Air_temperature:     298.0,
      Process_temperature: 308.0,
      Rotational_speed:    1500,
      Torque:              40.0,
      Tool_wear:           50,
      Type:                'M',
    },
  },
  warning: {
    label: 'Load Warning Example',
    icon:  '🟡',
    description: 'Elevated wear and torque — machine approaching failure threshold. Produces ~36% failure probability (Warning).',
    values: {
      Air_temperature:     301.0,
      Process_temperature: 314.0,
      Rotational_speed:    1360,
      Torque:              60.0,
      Tool_wear:           185,
      Type:                'H',
    },
  },
  critical: {
    label: 'Load Critical Example',
    icon:  '🔴',
    description: 'Severe sensor values — high probability of imminent failure.',
    values: {
      Air_temperature:     302.0,
      Process_temperature: 318.5,
      Rotational_speed:    1280,
      Torque:              76.0,
      Tool_wear:           230,
      Type:                'L',
    },
  },
};

// ── Field config ───────────────────────────────────────────────────────────────
const FIELDS = [
  { key: 'Air_temperature',     label: 'Air Temperature',     unit: 'K',   min: 290, max: 320, step: 0.1, placeholder: '298.0' },
  { key: 'Process_temperature', label: 'Process Temperature', unit: 'K',   min: 300, max: 330, step: 0.1, placeholder: '308.0' },
  { key: 'Rotational_speed',    label: 'Rotational Speed',    unit: 'rpm', min: 0,   max: 3000, step: 1,  placeholder: '1500'  },
  { key: 'Torque',              label: 'Torque',              unit: 'Nm',  min: 0,   max: 120, step: 0.1, placeholder: '40.0'  },
  { key: 'Tool_wear',           label: 'Tool Wear',           unit: 'h',   min: 0,   max: 260, step: 1,   placeholder: '50'    },
];

const FAILURE_LABELS = {
  HDF: 'Heat Dissipation Failure',
  PWF: 'Power Failure',
  OSF: 'Overstrain Failure',
  TWF: 'Tool Wear Failure',
  RNF: 'Random Failure',
};

const DEFAULT_VALUES = { ...PRESETS.healthy.values };

// ── Validation ─────────────────────────────────────────────────────────────────
function validate(form) {
  const errors = {};
  for (const f of FIELDS) {
    const raw = form[f.key];
    if (raw === '' || raw == null) { errors[f.key] = 'Required'; continue; }
    const val = Number(raw);
    if (isNaN(val))  { errors[f.key] = 'Must be a number'; continue; }
    if (val < 0)     { errors[f.key] = 'Must be ≥ 0'; continue; }
    if (f.key === 'Rotational_speed' && val === 0) { errors[f.key] = 'Speed must be > 0'; }
  }
  if (!form.Type) errors.Type = 'Required';
  return errors;
}

// ── Result display ─────────────────────────────────────────────────────────────
function PredictionResult({ result }) {
  const { status, failure_probability, predicted_failure_type } = result.prediction;
  const prob     = failure_probability ?? 0;
  const probPct  = (prob * 100).toFixed(1);
  const statusKey = (status || 'Healthy').toLowerCase();

  // Build a reading-like object for WhyExplanation
  const reading = {
    tool_wear:           result._submittedValues?.Tool_wear,
    torque:              result._submittedValues?.Torque,
    rotational_speed:    result._submittedValues?.Rotational_speed,
    process_temperature: result._submittedValues?.Process_temperature,
    air_temperature:     result._submittedValues?.Air_temperature,
  };

  return (
    <div className={`mt-result mt-result--${statusKey}`}>
      <div className={`mt-result__strip mt-result__strip--${statusKey}`} />
      <div className="mt-result__body">

        {/* Top row: badge + prob */}
        <div className="mt-result__top">
          <div className="mt-result__left">
            <span className={`mt-result__badge mt-result__badge--${statusKey}`}>
              <span className={`mt-result__dot${statusKey === 'critical' ? ' mt-result__dot--blink' : ''}`} />
              {status}
            </span>
            {predicted_failure_type && (
              <span className="mt-result__fail-type">
                ⚠ Likely: {FAILURE_LABELS[predicted_failure_type] || predicted_failure_type}
              </span>
            )}
          </div>
          <div className="mt-result__prob-block">
            <span className="mt-result__prob-label">Failure Risk</span>
            <span className={`mt-result__prob-val mt-result__prob-val--${statusKey}`}>{probPct}%</span>
          </div>
        </div>

        {/* Probability bar */}
        <div className="mt-result__bar-track">
          <div
            className={`mt-result__bar-fill mt-result__bar-fill--${statusKey}`}
            style={{ width: `${probPct}%` }}
          />
          <div className="mt-result__bar-markers">
            <span style={{ left: '30%' }} className="mt-result__marker mt-result__marker--warn" title="Warning threshold (30%)" />
            <span style={{ left: '60%' }} className="mt-result__marker mt-result__marker--crit" title="Critical threshold (60%)" />
          </div>
        </div>
        <div className="mt-result__bar-labels">
          <span>0%</span>
          <span className="mt-result__bar-warn">30% Warning</span>
          <span className="mt-result__bar-crit">60% Critical</span>
          <span>100%</span>
        </div>

        {/* Why explanation */}
        <div className="mt-result__why">
          <WhyExplanation reading={reading} status={status} />
        </div>
      </div>
    </div>
  );
}

// ── History item ───────────────────────────────────────────────────────────────
function HistoryItem({ item, index, onReload }) {
  const { status, failure_probability } = item.prediction;
  const prob    = ((failure_probability ?? 0) * 100).toFixed(1);
  const key     = (status || 'Healthy').toLowerCase();
  const v       = item._submittedValues;
  return (
    <div className={`mt-hist-item mt-hist-item--${key}`}>
      <div className={`mt-hist-item__strip mt-hist-item__strip--${key}`} />
      <div className="mt-hist-item__body">
        <div className="mt-hist-item__row">
          <span className={`mt-hist-badge mt-hist-badge--${key}`}>{status}</span>
          <span className="mt-hist-prob">{prob}%</span>
          <button className="mt-hist-reload" onClick={() => onReload(v)} title="Reload these values into the form">↺</button>
        </div>
        <div className="mt-hist-item__vals">
          tw={v.Tool_wear}h · tq={v.Torque}Nm · rpm={v.Rotational_speed} · T={v.Process_temperature}K · type={v.Type}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManualTest() {
  const [form,    setForm]    = useState({ ...DEFAULT_VALUES });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [apiError, setApiError] = useState(null);
  const [history, setHistory] = useState([]);  // last 5 predictions

  const handleChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const loadPreset = (key) => {
    setForm({ ...PRESETS[key].values });
    setErrors({});
    setResult(null);
    setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setResult(null);
    setApiError(null);

    // Build numeric payload (API expects PascalCase)
    const payload = {
      Air_temperature:     Number(form.Air_temperature),
      Process_temperature: Number(form.Process_temperature),
      Rotational_speed:    Number(form.Rotational_speed),
      Torque:              Number(form.Torque),
      Tool_wear:           Number(form.Tool_wear),
      Type:                form.Type,
    };

    try {
      const { data } = await api.post('/api/predict/manual', payload);
      const enriched = { ...data, _submittedValues: payload };
      setResult(enriched);
      // Prepend to history, keep last 5
      setHistory(prev => [enriched, ...prev].slice(0, 5));
    } catch (err) {
      setApiError(
        err.response?.data?.error || err.response?.data?.details || err.message || 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  const reloadFromHistory = (values) => {
    setForm({ ...values });
    setErrors({});
    setResult(null);
    setApiError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mt-page">
      <div className="container">

        {/* ── Page header ── */}
        <header className="mt-header">
          <div className="mt-header__icon">🧪</div>
          <div>
            <h1 className="mt-header__title">Manual Prediction Test</h1>
            <p className="mt-header__desc">
              Enter arbitrary sensor values below and submit them directly to the trained
              Random Forest ML model to get an instant failure prediction — without
              affecting any live machine data. Use this to explore how individual sensor
              values influence the model's decision, or to demo the ML pipeline to anyone
              unfamiliar with the project.
            </p>
          </div>
        </header>

        <div className="mt-layout">
          {/* ── LEFT: form panel ── */}
          <div className="mt-form-panel">

            {/* Preset buttons */}
            <div className="mt-presets">
              <p className="mt-presets__label">Quick fill presets</p>
              <div className="mt-presets__row">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    className={`mt-preset-btn mt-preset-btn--${key}`}
                    onClick={() => loadPreset(key)}
                    type="button"
                    title={p.description}
                  >
                    {p.icon} {p.label.replace('Load ', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form className="mt-form" onSubmit={handleSubmit} noValidate>
              <div className="mt-fields">
                {FIELDS.map(f => (
                  <div key={f.key} className={`mt-field${errors[f.key] ? ' mt-field--error' : ''}`}>
                    <label className="mt-field__label" htmlFor={`field-${f.key}`}>
                      {f.label}
                      <span className="mt-field__unit">{f.unit}</span>
                    </label>
                    <input
                      id={`field-${f.key}`}
                      className="mt-field__input"
                      type="number"
                      step={f.step}
                      min={f.min}
                      max={f.max}
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                    />
                    {errors[f.key] && (
                      <span className="mt-field__error" role="alert">{errors[f.key]}</span>
                    )}
                  </div>
                ))}

                {/* Type dropdown */}
                <div className={`mt-field${errors.Type ? ' mt-field--error' : ''}`}>
                  <label className="mt-field__label" htmlFor="field-type">
                    Machine Type
                    <span className="mt-field__unit">L / M / H</span>
                  </label>
                  <select
                    id="field-type"
                    className="mt-field__input mt-field__input--select"
                    value={form.Type || ''}
                    onChange={e => handleChange('Type', e.target.value)}
                  >
                    <option value="">Select type…</option>
                    <option value="L">L — Low quality</option>
                    <option value="M">M — Medium quality</option>
                    <option value="H">H — High quality</option>
                  </select>
                  {errors.Type && (
                    <span className="mt-field__error" role="alert">{errors.Type}</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className={`mt-submit${loading ? ' mt-submit--loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="mt-submit__spinner" />
                    Running prediction…
                  </>
                ) : (
                  <>⚡ Run ML Prediction</>
                )}
              </button>

              {apiError && (
                <div className="mt-api-error" role="alert">
                  <span>⚠ {apiError}</span>
                </div>
              )}
            </form>
          </div>

          {/* ── RIGHT: result + history ── */}
          <div className="mt-results-panel">
            {!result && !loading && (
              <div className="mt-empty">
                <span className="mt-empty__icon">📊</span>
                <p>Fill in the sensor values and click<br /><strong>Run ML Prediction</strong> to see results here.</p>
              </div>
            )}

            {loading && (
              <div className="mt-empty">
                <span className="mt-empty__spinner-lg" />
                <p>Querying ML model…</p>
              </div>
            )}

            {result && !loading && <PredictionResult result={result} />}

            {/* History */}
            {history.length > 0 && (
              <div className="mt-history">
                <h2 className="mt-history__title">Session History</h2>
                <p className="mt-history__sub">Last {history.length} prediction{history.length > 1 ? 's' : ''} — click ↺ to reload values</p>
                <div className="mt-history__list">
                  {history.map((item, i) => (
                    <HistoryItem key={i} item={item} index={i} onReload={reloadFromHistory} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
