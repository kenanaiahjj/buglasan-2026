import { ArrowUpRight } from '@phosphor-icons/react/dist/icons/ArrowUpRight';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  action?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function SectionHeading({ eyebrow, title, action, actionHref = '#', onAction }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (onAction ? <button className="text-button" onClick={onAction} type="button">{action} <ArrowUpRight aria-hidden="true" size={14} /></button> : <a className="text-button" href={actionHref}>{action} <ArrowUpRight aria-hidden="true" size={14} /></a>)}
    </div>
  );
}
