// 内容卡片组件，统一展示动态摘要、互动计数和操作区。
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, UserRound } from 'lucide-react';
import type { ContentItem } from '../api/types';
import { formatDate, statusLabel } from '../lib/format';
import { InteractionBar } from './InteractionBar';

// 内容卡片入参支持紧凑模式、跳转地址和外部操作区。
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
        <span className="inline-author"><UserRound size={15} />用户 #{content.userId}</span>
        <span><CalendarDays size={15} />{formatDate(content.createdAt)}</span>
      </div>
      <h2>{title}</h2>
      {content.rejectReason ? <p className="danger-text">驳回原因：{content.rejectReason}</p> : null}
      {content.status === 'published' ? <InteractionBar content={content} /> : null}
      <div className="card-footer">
        {actions ? <div className="card-actions">{actions}</div> : null}
        {to ? <span className="open-cue"><ArrowUpRight size={16} />查看</span> : null}
      </div>
    </article>
  );

  return to ? <Link className="card-link" to={to}>{inner}</Link> : inner;
}
