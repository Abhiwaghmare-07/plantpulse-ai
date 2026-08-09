import { useSocket } from '../../context/SocketContext';

export default function Dashboard() {
  const { isConnected } = useSocket();

  return (
    <div className="page fade-in">
      <div className="coming-soon">
        <div className="coming-soon__icon">🏭</div>
        <h1 className="coming-soon__title">Machine Dashboard</h1>
        <p className="coming-soon__subtitle">
          Real-time machine health monitoring — coming in the next module.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            padding: '8px 16px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected ? 'var(--status-healthy)' : 'var(--text-muted)',
              boxShadow: isConnected ? '0 0 6px var(--status-healthy)' : 'none',
              flexShrink: 0,
              animation: isConnected ? 'pulse-dot 2s infinite' : 'none',
            }}
          />
          Socket.io: {isConnected ? 'Connected ✓' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
}
