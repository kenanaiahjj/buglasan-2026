export function StatCard({ label, value, detail, accent = '' }: { label: string; value: string; detail: string; accent?: string }) {
  return <div className={`stat-card${accent ? ` stat-card--${accent}` : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
