import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MachineCard.css';

const FAILURE_LABELS = {
  HDF: 'Heat Dissipation Failure',
  PWF: 'Power Failure',
  OSF: 'Overstrain Failure',
  TWF: 'Tool Wear Failure',
};

function RelativeTime({ dateStr }) {
  const [label, setLabel] = useState('—');
  useEffect(() => {
    if (!dateStr) return;
    const tick = () => {
      const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
      if (s < 5)         setLabel('just now');
      else if (s < 60)   setLabel(`${s}s ago`);
      else if (s < 3600) setLabel(`${Math.floor(s / 60)}m ago`);
      else               setLabel(new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateStr]);
  return label;
}

export default function MachineCard({ machine }) {
  const navigate = useNavigate();
  const [isFlashing, setIsFlashing] = useState(false);
  const prevUpdated = useRef(machine.lastUpdated);

  // Trigger flash animation whenever the reading updates
  useEffect(() => {
    if (prevUpdated.current === machine.lastUpdated) return;
    prevUpdated.current = machine.lastUpdated;
    setIsFlashing(true);
    const t = setTimeout(() => setIsFlashing(false), 900);
    return () => clearTimeout(t);
  }, [machine.lastUpdated]);

  const r = machine.lastReading || {};
  const pred = machine.prediction || {};
  const prob = pred.failure_probability ?? machine.failure_probability ?? null;
  const failType = pred.predicted_failure_type || machine.predicted_failure_type;
  const status = machine.status || 'Healthy';
  const statusKey = status.toLowerCase();

  const twPct = r.tool_wear != null ? Math.min(100, (r.tool_wear / 250) * 100) : 0;
  const probPct = prob != null ? prob * 100 : 0;

  return (
    <article
      className={`mc mc--${statusKey}${isFlashing ? ' mc--flash' : ''}`}
      onClick={() => navigate(`/machine/${machine.machineId}`)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/machine/${machine.machineId}`)}
      aria-label={`${machine.name} — ${status}`}
      role="button"
    >
      {/* Colored status strip (left border accent) */}
      <div className={`mc__strip mc__strip--${statusKey}`} />

      <div className="mc__body">
        {/* ── Header ── */}
        <header className="mc__head">
          <div className="mc__titles">
            <span className="mc__id-top">{machine.machineId}</span>
            <h3 className="mc__name">{machine.name}</h3>
          </div>
          <span className={`badge badge--${statusKey}`}>
            <span className={`mc__badge-dot${statusKey === 'critical' ? ' mc__badge-dot--blink' : ''}`} />
            {status}
          </span>
        </header>

        {/* ── Sensor Readings ── */}
        <div className="mc__sensors">
          <div className="mc__sensor">
            <span className="mc__sensor-label">Tool Wear</span>
            <div className="mc__sensor-val">
              {r.tool_wear != null ? r.tool_wear.toFixed(1) : '—'}
              <span className="mc__sensor-unit">h</span>
            </div>
            <div className="mc__mini-bar">
              <div
                className={`mc__mini-fill mc__mini-fill--${statusKey}`}
                style={{ width: `${twPct}%` }}
              />
            </div>
          </div>

          <div className="mc__sensor">
            <span className="mc__sensor-label">Torque</span>
            <div className="mc__sensor-val">
              {r.torque != null ? r.torque.toFixed(1) : '—'}
              <span className="mc__sensor-unit">Nm</span>
            </div>
          </div>

          <div className="mc__sensor">
            <span className="mc__sensor-label">Speed</span>
            <div className="mc__sensor-val">
              {r.rotational_speed != null
                ? Math.round(r.rotational_speed).toLocaleString()
                : '—'}
              <span className="mc__sensor-unit">rpm</span>
            </div>
          </div>
        </div>

        {/* ── Failure Prediction ── */}
        <div className="mc__pred">
          {prob !== null ? (
            <>
              <div className="mc__pred-row">
                <span className="mc__pred-label">Failure Risk</span>
                <span className={`mc__pred-pct mc__pred-pct--${statusKey}`}>
                  {probPct.toFixed(1)}%
                </span>
              </div>
              <div className="mc__prob-track">
                <div
                  className={`mc__prob-fill mc__prob-fill--${statusKey}`}
                  style={{ width: `${probPct}%` }}
                />
              </div>
              {failType && (
                <div className="mc__fail-type">
                  <span className="mc__fail-icon">⚠</span>
                  <span>Likely: {FAILURE_LABELS[failType] || failType}</span>
                </div>
              )}
            </>
          ) : (
            <div className="mc__pred-pending">
              <span className="mc__pending-dot" />
              Awaiting first prediction…
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="mc__foot">
          <span className="mc__type-chip">Type {machine.type}</span>
          <span className="mc__updated">
            ↻ <RelativeTime dateStr={machine.lastUpdated} />
          </span>
        </footer>
      </div>
    </article>
  );
}
