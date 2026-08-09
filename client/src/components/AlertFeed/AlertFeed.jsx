import { useEffect, useState } from 'react';
import api from '../../services/api';
import './AlertFeed.css';

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
  return <>{label}</>;
}

function AlertItem({ alert, onAck, isNew }) {
  const [acking, setAcking] = useState(false);
  const statusKey = (alert.status || 'warning').toLowerCase();

  const handleAck = async (e) => {
    e.stopPropagation();
    setAcking(true);
    try {
      await onAck(alert._id);
    } catch (err) {
      console.error('Acknowledge failed:', err);
    } finally {
      setAcking(false);
    }
  };

  return (
    <div
      className={[
        'af-item',
        `af-item--${statusKey}`,
        alert.acknowledged ? 'af-item--acked' : '',
        isNew ? 'af-item--new' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className={`af-item__strip af-item__strip--${statusKey}`} />

      <div className="af-item__content">
        <p className="af-item__msg">{alert.message}</p>
        <div className="af-item__meta">
          <span className={`af-item__severity af-item__severity--${statusKey}`}>
            {statusKey === 'critical' ? '⚠ Critical' : '⚡ Warning'}
          </span>
          <span className="af-item__dot">·</span>
          <span className="af-item__time">
            <RelativeTime dateStr={alert.createdAt} />
          </span>
        </div>
      </div>

      <div className="af-item__action">
        {alert.acknowledged ? (
          <span className="af-item__acked" title="Acknowledged">✓</span>
        ) : (
          <button
            className="af-item__ack-btn"
            onClick={handleAck}
            disabled={acking}
            title="Acknowledge this alert"
          >
            {acking ? '…' : 'Ack'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AlertFeed({ socket }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState(new Set());

  // Initial fetch
  useEffect(() => {
    api.get('/api/alerts')
      .then(({ data }) => setAlerts(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Live subscription to new alerts
  useEffect(() => {
    if (!socket) return;
    const handler = (newAlert) => {
      // Deduplicate
      setAlerts(prev => {
        if (prev.some(a => a._id === newAlert._id)) return prev;
        return [newAlert, ...prev];
      });
      // Mark as "new" for slide-in animation, then remove marker
      setNewIds(prev => new Set([...prev, newAlert._id]));
      setTimeout(() => {
        setNewIds(prev => {
          const next = new Set(prev);
          next.delete(newAlert._id);
          return next;
        });
      }, 700);
    };
    socket.on('alert:new', handler);
    return () => socket.off('alert:new', handler);
  }, [socket]);

  const handleAck = async (id) => {
    await api.patch(`/api/alerts/${id}/acknowledge`);
    setAlerts(prev =>
      prev.map(a => a._id === id ? { ...a, acknowledged: true } : a)
    );
  };

  const activeCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="alert-feed">
      {/* Header */}
      <div className="af-header">
        <h2 className="af-title">Alert Feed</h2>
        <span className={`af-badge${activeCount > 0 ? ' af-badge--active' : ''}`}>
          {activeCount} active
        </span>
      </div>

      {/* List */}
      <div className="af-list">
        {loading && (
          <div className="af-state">
            <span className="af-state__dot" />
            Loading alerts…
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="af-state af-state--clear">
            <span className="af-state__icon">✓</span>
            <p>All clear — no alerts</p>
          </div>
        )}

        {alerts.map(alert => (
          <AlertItem
            key={alert._id}
            alert={alert}
            onAck={handleAck}
            isNew={newIds.has(alert._id)}
          />
        ))}
      </div>
    </div>
  );
}
