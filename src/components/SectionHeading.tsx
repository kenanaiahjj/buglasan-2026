type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  action?: string;
  actionHref?: string;
};

export function SectionHeading({ eyebrow, title, action, actionHref = '#' }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && <a className="text-button" href={actionHref}>{action} <span aria-hidden="true">↗</span></a>}
    </div>
  );
}
