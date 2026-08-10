import './WhyExplanation.css';

/**
 * Healthy ranges derived from the AI4I 2020 dataset EDA.
 * Each sensor has:
 *  - label / unit / key
 *  - thresholds with level (normal | warning | critical)
 *  - direction: 'high' = bad if too high, 'low' = bad if too low
 */
const THRESHOLDS = [
  {
    key:       'tool_wear',
    label:     'Tool Wear',
    unit:      'h',
    direction: 'high',
    tiers: [
      { above: 200, level: 'critical',
        msg: v => `Tool wear (${v.toFixed(1)}h) is critically high — normal range is 0–150h. This is the primary driver of overstrain and tool wear failure. Immediate tool replacement recommended.` },
      { above: 150, level: 'warning',
        msg: v => `Tool wear (${v.toFixed(1)}h) is elevated — normal range is 0–150h. Risk of overstrain failure is increasing as wear accumulates.` },
    ],
  },
  {
    key:       'torque',
    label:     'Torque',
    unit:      'Nm',
    direction: 'high',
    tiers: [
      { above: 72, level: 'critical',
        msg: v => `Torque (${v.toFixed(1)} Nm) is critically high — normal operating range is 10–60 Nm. Excessive mechanical load significantly increases overstrain failure risk.` },
      { above: 60, level: 'warning',
        msg: v => `Torque (${v.toFixed(1)} Nm) is elevated — normal operating range is 10–60 Nm. Sustained high torque accelerates tool degradation.` },
    ],
  },
  {
    key:       'rotational_speed',
    label:     'Rotational Speed',
    unit:      'rpm',
    direction: 'low',
    tiers: [
      { below: 1250, level: 'critical',
        msg: v => `Rotational speed (${Math.round(v)} rpm) is critically low — normal range is 1300–1800 rpm. Severe speed drop often precedes power failure.` },
      { below: 1350, level: 'warning',
        msg: v => `Rotational speed (${Math.round(v)} rpm) is below normal — normal range is 1300–1800 rpm. Low speed combined with high torque increases power failure risk.` },
    ],
  },
  {
    key:       'process_temperature',
    label:     'Process Temperature',
    unit:      'K',
    direction: 'high',
    tiers: [
      { above: 317, level: 'critical',
        msg: v => `Process temperature (${v.toFixed(1)} K) is critically high — normal range is 305–313 K. Elevated temperature is a leading indicator of heat dissipation failure.` },
      { above: 313, level: 'warning',
        msg: v => `Process temperature (${v.toFixed(1)} K) is elevated — normal range is 305–313 K. Thermal stress may be contributing to failure risk.` },
    ],
  },
];

/**
 * Evaluate a single reading against all thresholds.
 * Returns array of findings: { key, label, unit, level, msg }
 */
function evaluate(reading) {
  if (!reading) return [];
  const findings = [];

  for (const sensor of THRESHOLDS) {
    const val = reading[sensor.key];
    if (val == null) continue;

    let matched = false;
    for (const tier of sensor.tiers) {
      if (sensor.direction === 'high' && val > tier.above) {
        findings.push({ key: sensor.key, label: sensor.label, level: tier.level, msg: tier.msg(val) });
        matched = true;
        break;
      }
      if (sensor.direction === 'low' && val < tier.below) {
        findings.push({ key: sensor.key, label: sensor.label, level: tier.level, msg: tier.msg(val) });
        matched = true;
        break;
      }
    }
    if (!matched) {
      // All clear for this sensor — only add a positive note for the ones people care about
    }
  }

  return findings;
}

export default function WhyExplanation({ reading, status }) {
  const findings = evaluate(reading);
  const hasIssues = findings.length > 0;

  return (
    <section className="why">
      <h2 className="why__heading">Why this prediction?</h2>
      <p className="why__subtitle">
        Rule-based analysis comparing current sensor values against healthy operating ranges
        derived from the AI4I 2020 dataset.
      </p>

      {!reading && (
        <div className="why__empty">
          <span className="why__dot" /> Awaiting first reading…
        </div>
      )}

      {reading && !hasIssues && (
        <div className="why__all-clear">
          <span className="why__all-clear__icon">✓</span>
          <div>
            <strong>All sensors within normal range</strong>
            <p>
              Tool wear · Torque · Rotational Speed · Process Temperature are all inside
              healthy operating bounds. Failure probability is expected to remain low.
            </p>
          </div>
        </div>
      )}

      {hasIssues && (
        <div className="why__findings">
          {findings.map(f => (
            <div key={f.key} className={`why__item why__item--${f.level}`}>
              <div className={`why__strip why__strip--${f.level}`} />
              <div className="why__item-body">
                <div className="why__item-head">
                  <span className={`why__sensor-tag why__sensor-tag--${f.level}`}>
                    {f.label}
                  </span>
                  <span className={`why__level-badge why__level-badge--${f.level}`}>
                    {f.level === 'critical' ? '⚠ Critical' : '⚡ Elevated'}
                  </span>
                </div>
                <p className="why__msg">{f.msg}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Normal ranges reference table */}
      <details className="why__ref">
        <summary className="why__ref-summary">View normal operating ranges</summary>
        <table className="why__table">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Normal</th>
              <th>Elevated</th>
              <th>Critical</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Tool Wear</td><td>0 – 150 h</td><td>150 – 200 h</td><td>&gt; 200 h</td></tr>
            <tr><td>Torque</td><td>10 – 60 Nm</td><td>60 – 72 Nm</td><td>&gt; 72 Nm</td></tr>
            <tr><td>Rotational Speed</td><td>1350 – 1800 rpm</td><td>1250 – 1350 rpm</td><td>&lt; 1250 rpm</td></tr>
            <tr><td>Process Temperature</td><td>305 – 313 K</td><td>313 – 317 K</td><td>&gt; 317 K</td></tr>
          </tbody>
        </table>
      </details>
    </section>
  );
}
