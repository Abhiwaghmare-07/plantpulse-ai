import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import './SensorChart.css';

/* Custom dark tooltip */
function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="sc-tooltip">
      <span className="sc-tooltip__label">#{label}</span>
      <span className="sc-tooltip__val">
        {val != null ? val.toFixed(1) : '—'} {unit}
      </span>
    </div>
  );
}

/**
 * SensorChart — a single recharts LineChart wrapped in a card-like container.
 *
 * Props:
 *  title            string     label shown above chart
 *  data             array      [{index, value, ...}, ...]  — chronological, oldest first
 *  dataKey          string     which key to plot from data
 *  unit             string     e.g. "h", "Nm", "rpm", "K"
 *  color            string     line stroke color
 *  warningLevel     number?    draws a dashed amber reference line
 *  criticalLevel    number?    draws a dashed red reference line
 *  invertThreshold  bool       if true, LOW values are bad (e.g. RPM)
 *  domain           [min, max] YAxis domain (auto if omitted)
 */
export default function SensorChart({
  title,
  data,
  dataKey,
  unit,
  color,
  warningLevel,
  criticalLevel,
  domain,
}) {
  const latest = data[data.length - 1]?.[dataKey];

  return (
    <div className="sc-card">
      <div className="sc-card__head">
        <span className="sc-card__title">{title}</span>
        {latest != null && (
          <span className="sc-card__current" style={{ color }}>
            {latest.toFixed(1)}
            <span className="sc-card__unit">{unit}</span>
          </span>
        )}
      </div>

      <div className="sc-chart-wrap">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="index"
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain || ['auto', 'auto']}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip unit={unit} />}
              cursor={{ stroke: '#1e2d40', strokeWidth: 1 }}
            />

            {/* Warning reference line */}
            {warningLevel != null && (
              <ReferenceLine
                y={warningLevel}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeOpacity={0.55}
                strokeWidth={1}
              />
            )}

            {/* Critical reference line */}
            {criticalLevel != null && (
              <ReferenceLine
                y={criticalLevel}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeOpacity={0.55}
                strokeWidth={1}
              />
            )}

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}   /* disable per-point animation for live updates */
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
