import { ArrowUpRight } from '@phosphor-icons/react/dist/icons/ArrowUpRight';
import type { Announcement } from '../data/pageant';

export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  return (
    <div className="dashboard-announcements">
      {announcements.map((announcement) => (
        <article className="dashboard-announcement" key={announcement.title}>
          <span className={`dashboard-announcement__date dashboard-announcement__date--${announcement.type}`}>{announcement.date}</span>
          <div><strong>{announcement.title}</strong><p>{announcement.description}</p></div>
          <ArrowUpRight aria-hidden="true" className="dashboard-announcement__arrow" size={15} />
        </article>
      ))}
    </div>
  );
}
