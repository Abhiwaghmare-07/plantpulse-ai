import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import SensorChart from './SensorChart';
import WhyExplanation from './WhyExplanation';
import './MachineDetail.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const FAILURE_LABELS = {
  HDF: 'Heat Dissipation Failure',
  PWF: 'Power Failure',
  OSF: 'Overstrain Failure',
  TWF: 'Tool Wear Failure',
  RNF: 'Random Failure',
};

const MAX_CHART_POINTS = 50;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format an ISO timestamp as HH:MM:SS */
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Format an ISO timestamp as readable date+time */
function fmtFull(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** Convert raw readings array (newest-first from API) to chart-friendly
 *  array (oldest-first) with an index field. */
function toChartData(readings) {
  return readings
    .slice()
    .reverse()
    .map((r, i) => ({
      index: i + 1,
      tool_wear:           r.tool_wear,
      torque:              r.torque,
      rotational_speed:    r.rotational_speed,
      process_temperature: r.process_temperature,
      air_temperature:     r.air_temperature,
      status:              r.status,
      ts:                  r.timestamp || r.createdAt,
    }));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const key = (status || 'Healthy').toLowerCase();
  return (
    <span className={`md-badge md-badge--${key}`}>
      <span className={`md-badge__dot${key === 'critical' ? ' md-badge__dot--blink' : ''}`} />
      {status}
    </span>
  );
}

function ReadingRow({ r, index }) {
  const statusKey = (r.status || 'Healthy').toLowerCase();
  return (
    <tr className={`md-table__row md-table__row--${statusKey}`}>
      <td className="md-table__td md-table__td--mono">{fmtFull(r.timestamp || r.createdAt)}</td>
      <td className="md-table__td md-table__td--mono">{r.tool_wear?.toFixed(1)}</td>
      <td className="md-table__td md-table__td--mono">{r.torque?.toFixed(1)}</td>
      <td className="md-table__td md-table__td--mono">{r.rotational_speed != null ? Math.round(r.rotational_speed).toLocaleString() : '—'}</td>
      <td className="md-table__td md-table__td--mono">{r.process_temperature?.toFixed(1)}</td>
      <td className="md-table__td">
        <span className={`md-table__status md-table__status--${statusKey}`}>{r.status}</span>
      </td>
      <td className="md-table__td md-table__td--mono">
        {r.failure_probability != null
          ? `${(r.failure_probability * 100).toFixed(1)}%`
          : '—'}
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MachineDetail() {
  const { machineId } = useParams();
  const { socket } = useSocket();

  const [machine,  setMachine]  = useState(null);
  const [readings, setReadings] = useState([]);   // newest-first (raw from API)
  const [chartData, setChartData] = useState([]); // oldest-first (for charts)
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liveCount, setLiveCount] = useState(0);  // count of socket updates received

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!machineId) return;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/api/machines/${machineId}`),
      api.get(`/api/readings/${machineId}`),
    ])
      .then(([mRes, rRes]) => {
        setMachine(mRes.data.data);
        const rawReadings = rRes.data.data || [];
        setReadings(rawReadings);
        setChartData(toChartData(rawReadings));
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else console.error('MachineDetail fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [machineId]);

  // ── Live socket subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handler = (update) => {
      // Filter to only this machine's events
      if (update.machineId !== machineId) return;

      setLiveCount(c => c + 1);

      // Update the machine header (status, probability, reading, prediction)
      setMachine(prev => prev ? {
        ...prev,
        status:      update.status,
        lastReading: update.lastReading,
        lastUpdated: update.lastUpdated,
        prediction:  update.prediction,
      } : prev);

      // Build a new reading from the update payload and prepend to raw list
      const newReading = {
        _id:                 `live-${Date.now()}`,
        timestamp:           update.lastUpdated,
        tool_wear:           update.lastReading?.tool_wear,
        torque:              update.lastReading?.torque,
        rotational_speed:    update.lastReading?.rotational_speed,
        process_temperature: update.lastReading?.process_temperature,
        air_temperature:     update.lastReading?.air_temperature,
        status:              update.status,
        failure_probability: update.prediction?.failure_probability,
        predicted_failure_type: update.prediction?.predicted_failure_type,
      };

      setReadings(prev => {
        const next = [newReading, ...prev].slice(0, MAX_CHART_POINTS);
        // Update chart data in the same pass (oldest-first)
        setChartData(toChartData(next));
        return next;
      });
    };

    socket.on('machine:update', handler);
    return () => socket.off('machine:update', handler);
  }, [socket, machineId]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const currentReading = machine?.lastReading || readings[0] || null;
  const prediction     = machine?.prediction || null;
  const prob           = prediction?.failure_probability ?? null;
  const failType       = prediction?.predicted_failure_type;
  const statusKey      = (machine?.status || 'Healthy').toLowerCase();
  const recentTable    = readings.slice(0, 10);

  // ── Render: Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="md-page container">
        <div className="md-loading">
          <span className="md-loading__dot" />
          <span className="md-loading__dot" style={{ animationDelay: '0.2s' }} />
          <span className="md-loading__dot" style={{ animationDelay: '0.4s' }} />
          <p>Loading machine data…</p>
        </div>
      </div>
    );
  }

  // ── Render: Not found ───────────────────────────────────────────────────────
  if (notFound || !machine) {
    return (
      <div className="md-page container">
        <div className="md-not-found">
          <div className="md-not-found__icon">🏭</div>
          <h1>Machine not found</h1>
          <p>No machine with ID <code>{machineId}</code> exists in the system.</p>
          <Link to="/" className="md-back-btn md-back-btn--prominent">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: Detail page ─────────────────────────────────────────────────────
  return (
    <div className="md-page">
      <div className="container">

        {/* ── Back link ── */}
        <Link to="/" className="md-back-link">
          ← Dashboard
        </Link>

        {/* ── Machine header ── */}
        <header className={`md-header md-header--${statusKey}`}>
          <div className="md-header__left">
            <span className="md-header__machine-id">{machine.machineId}</span>
            <h1 className="md-header__name">{machine.name}</h1>
            <div className="md-header__meta">
              <span className="md-header__type-chip">Type {machine.type}</span>
              {liveCount > 0 && (
                <span className="md-header__live-pill">
                  <span className="md-header__live-dot" />
                  Live · {liveCount} update{liveCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="md-header__right">
            <StatusBadge status={machine.status} />

            <div className="md-header__prob-block">
              <span className="md-header__prob-label">Failure Risk</span>
              <span className={`md-header__prob-val md-header__prob-val--${statusKey}`}>
                {prob != null ? `${(prob * 100).toFixed(1)}%` : '—'}
              </span>
              {prob != null && (
                <div className="md-header__prob-bar">
                  <div
                    className={`md-header__prob-fill md-header__prob-fill--${statusKey}`}
                    style={{ width: `${(prob * 100).toFixed(1)}%` }}
                  />
                </div>
              )}
            </div>

            {failType && (
              <div className="md-header__fail-type">
                <span className="md-header__fail-icon">⚠</span>
                {FAILURE_LABELS[failType] || failType}
              </div>
            )}
          </div>
        </header>

        {/* ── Chart grid ── */}
        <section className="md-charts" aria-label="Sensor trend charts">
          <h2 className="md-section-title">Sensor Trends</h2>
          <p className="md-section-sub">
            Last {chartData.length} readings — updates live via socket
          </p>
          <div className="md-charts__grid">
            <SensorChart
              title="Tool Wear"
              data={chartData}
              dataKey="tool_wear"
              unit="h"
              color="#38bdf8"
              warningLevel={150}
              criticalLevel={200}
              domain={[0, 260]}
            />
            <SensorChart
              title="Torque"
              data={chartData}
              dataKey="torque"
              unit="Nm"
              color="#a78bfa"
              warningLevel={60}
              criticalLevel={72}
              domain={[10, 100]}
            />
            <SensorChart
              title="Rotational Speed"
              data={chartData}
              dataKey="rotational_speed"
              unit="rpm"
              color="#34d399"
              warningLevel={1350}
              criticalLevel={1250}
              domain={[1150, 1900]}
            />
            <SensorChart
              title="Process Temperature"
              data={chartData}
              dataKey="process_temperature"
              unit="K"
              color="#fb923c"
              warningLevel={313}
              criticalLevel={317}
              domain={[304, 326]}
            />
          </div>
        </section>

        {/* ── Why section ── */}
        <WhyExplanation reading={currentReading} status={machine.status} />

        {/* ── Reading history table ── */}
        <section className="md-history" aria-label="Reading history">
          <h2 className="md-section-title">Recent Readings</h2>
          <p className="md-section-sub">Last 10 readings — newest first</p>

          <div className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>
                  <th className="md-table__th">Timestamp</th>
                  <th className="md-table__th">Tool Wear (h)</th>
                  <th className="md-table__th">Torque (Nm)</th>
                  <th className="md-table__th">Speed (rpm)</th>
                  <th className="md-table__th">Proc. Temp (K)</th>
                  <th className="md-table__th">Status</th>
                  <th className="md-table__th">Failure Risk</th>
                </tr>
              </thead>
              <tbody>
                {recentTable.map((r, i) => (
                  <ReadingRow key={r._id || i} r={r} index={i} />
                ))}
                {recentTable.length === 0 && (
                  <tr>
                    <td colSpan={7} className="md-table__empty">No readings recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
