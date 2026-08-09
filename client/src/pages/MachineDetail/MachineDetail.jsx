import { useParams } from 'react-router-dom';

export default function MachineDetail() {
  const { machineId } = useParams();

  return (
    <div className="page fade-in">
      <div className="coming-soon">
        <div className="coming-soon__icon">🔧</div>
        <h1 className="coming-soon__title">Machine Detail</h1>
        <p className="coming-soon__subtitle">
          Deep-dive telemetry and failure history for{' '}
          <code
            style={{
              background: 'var(--bg-elevated)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {machineId}
          </code>
        </p>
        <p className="coming-soon__subtitle" style={{ marginTop: 8 }}>
          Coming in the next module.
        </p>
      </div>
    </div>
  );
}
