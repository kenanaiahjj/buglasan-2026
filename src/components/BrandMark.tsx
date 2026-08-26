export function BrandMark({ compact = false, official = false }: { compact?: boolean; official?: boolean }) {
  if (official) {
    return (
      <span className={`brand-mark brand-mark--official${compact ? ' brand-mark--compact' : ''}`}>
        <img alt="Buglasan Festival 2026" src="/assets/buglasan-logo-transparent.webp" width={972} height={526} decoding="async" />
      </span>
    );
  }

  return (
    <div className={`brand-mark${compact ? ' brand-mark--compact' : ''}`}>
      <span className="brand-mark__crest" aria-hidden="true">✦</span>
      <span className="brand-mark__type">
        <strong>BUGLASAN</strong>
        <small>{compact ? '2026' : 'Festival of Festivals · 2026'}</small>
      </span>
    </div>
  );
}
