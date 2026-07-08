import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, UserRound } from 'lucide-react';
import type { ContentItem } from '../api/types';
import { formatDate, statusLabel } from '../lib/format';

interface ContentCardProps {
  content: ContentItem;
  to?: string;
  compact?: boolean;
  actions?: ReactNode;
}

export function ContentCard({ content, to, compact = false, actions }: ContentCardProps) {
  const body = content.body?.trim() || '图片动态';
  const title = body.length > 80 ? body.slice(0, 80) + '...' : body;
  const inner = (
    <article className={'content-card' + (compact ? ' compact' : '')}>
      <div className="card-topline">
        <span className="record-id">#{String(content.id).padStart(4, '0')}</span>
        <span className={'badge status-' + content.status}>{statusLabel(content.status)}</span>
      </div>
      <div className="card-meta">
        <span><UserRound size={15} />用户 #{content.userId}</span>
        <span><CalendarDays size={15} />{formatDate(content.createdAt)}</span>
      </div>
      <h2>{title}</h2>
      {content.rejectReason ? <p className="danger-text">驳回原因：{content.rejectReason}</p> : null}
      <div className="card-footer">
        {actions ? <div className="card-actions">{actions}</div> : null}
        {to ? <span className="open-cue"><ArrowUpRight size={16} />查看</span> : null}
      </div>
    </article>
  );

  return to ? <Link className="card-link" to={to}>{inner}</Link> : inner;
}
