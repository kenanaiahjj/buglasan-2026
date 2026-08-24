export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark${compact ? ' brand-mark--compact' : ''}`}>
      <span className="brand-mark__crest" aria-hidden="true">✦</span>
      <span className="brand-mark__type">
        <strong>BUGLASAN</strong>
        <small>{compact ? '2026' : 'Gandang Negresense · 2026'}</small>
      </span>
    </div>
  );
}
