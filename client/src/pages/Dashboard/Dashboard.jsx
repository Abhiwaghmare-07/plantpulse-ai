import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import MachineCard from './MachineCard';
import AlertFeed from '../../components/AlertFeed/AlertFeed';
import './Dashboard.css';

/** Shimmer skeleton placeholder while machines load */
function SkeletonCard() {
  return (
    <div className="mc-skel" aria-hidden="true">
      <div className="mc-skel__strip" />
      <div className="mc-skel__body">
        <div className="mc-skel__row">
          <div className="mc-skel__block mc-skel__block--wide" />
          <div className="mc-skel__block mc-skel__block--badge" />
        </div>
        <div className="mc-skel__row">
          <div className="mc-skel__block mc-skel__block--sensor" />
          <div className="mc-skel__block mc-skel__block--sensor" />
          <div className="mc-skel__block mc-skel__block--sensor" />
        </div>
        <div className="mc-skel__block mc-skel__block--pred" />
        <div className="mc-skel__row mc-skel__row--foot">
          <div className="mc-skel__block mc-skel__block--chip" />
          <div className="mc-skel__block mc-skel__block--time" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { socket, isConnected } = useSocket();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Initial data fetch ──────────────────────────────────────
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const { data } = await api.get('/api/machines');
        // Sort by machineId for stable card positions
        const sorted = [...(data.data || [])].sort((a, b) =>
          a.machineId.localeCompare(b.machineId)
        );
        setMachines(sorted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMachines();
  }, []);

  // ── Live socket subscription ────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (update) => {
      setMachines(prev =>
        prev.map(m =>
          m.machineId === update.machineId
            ? {
                ...m,
                status:      update.status,
                lastReading: update.lastReading,
                lastUpdated: update.lastUpdated,
                prediction:  update.prediction,
              }
            : m
        )
      );
    };
    socket.on('machine:update', handler);
    return () => socket.off('machine:update', handler);
  }, [socket]);

  // ── Derived summary counts ──────────────────────────────────
  const counts = machines.reduce(
    (acc, m) => {
      const k = (m.status || 'Healthy').toLowerCase();
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0 }
  );

  return (
    <div className="dashboard">

      {/* ── Sticky Summary Bar ── */}
      <div className="dash-bar">
        <div className="dash-bar__inner container">
          <div className="dash-bar__left">
            <h1 className="dash-bar__heading">Machine Fleet</h1>
            <div className="dash-bar__live">
              <span className={`dash-bar__dot${isConnected ? ' dash-bar__dot--on' : ''}`} />
              <span className="dash-bar__live-text">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          <div className="dash-bar__counts">
            <div className="dash-count">
              <span className="dash-count__n">{machines.length}</span>
              <span className="dash-count__label">Machines</span>
            </div>
            <div className="dash-count__divider" />
            <div className="dash-count dash-count--healthy">
              <span className="dash-count__n">{counts.healthy}</span>
              <span className="dash-count__label">Healthy</span>
            </div>
            <div className="dash-count dash-count--warning">
              <span className="dash-count__n">{counts.warning}</span>
              <span className="dash-count__label">Warning</span>
            </div>
            <div className="dash-count dash-count--critical">
              <span className="dash-count__n">{counts.critical}</span>
              <span className="dash-count__label">Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="dash-body container">

        {/* Machine Grid Section */}
        <section className="dash-main" aria-label="Machine cards">

          {error && (
            <div className="dash-error" role="alert">
              <span className="dash-error__icon">⚠</span>
              {error} — is the Express server running on port 5000?
            </div>
          )}

          {loading ? (
            <div className="dash-grid">
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : machines.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty__icon">🏭</div>
              <h2>No machines found</h2>
              <p>Make sure the Express server and simulator are running.</p>
            </div>
          ) : (
            <div className="dash-grid">
              {machines.map(m => (
                <MachineCard key={m.machineId} machine={m} />
              ))}
            </div>
          )}
        </section>

        {/* Alert Feed Sidebar */}
        <aside className="dash-sidebar" aria-label="Alert feed">
          <AlertFeed socket={socket} />
        </aside>
      </div>
    </div>
  );
}
