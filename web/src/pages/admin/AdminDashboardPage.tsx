import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Files, MessageSquareWarning, Newspaper, Tags, UsersRound } from 'lucide-react';
import { listAdminComments, listAdminContents, listAdminFiles, listAdminTags, listAdminUsers } from '../../api/admin';
import { getErrorMessage } from '../../lib/errors';

interface Metric {
  label: string;
  value: number | string;
  to: string;
  icon: React.ComponentType<{ size?: number }>;
}

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMetrics() {
      setError('');
      try {
        const [users, contents, comments, tags, files] = await Promise.all([
          listAdminUsers({ page: 1, pageSize: 1 }),
          listAdminContents({ page: 1, pageSize: 1 }),
          listAdminComments({ page: 1, pageSize: 1 }),
          listAdminTags({ page: 1, pageSize: 1 }),
          listAdminFiles({ page: 1, pageSize: 1 })
        ]);
        setMetrics([
          { label: '用户', value: users.total, to: '/admin/users', icon: UsersRound },
          { label: '内容', value: contents.total, to: '/admin/contents', icon: Newspaper },
          { label: '评论', value: comments.total, to: '/admin/comments', icon: MessageSquareWarning },
          { label: '标签', value: tags.total, to: '/admin/tags', icon: Tags },
          { label: '文件', value: files.total, to: '/admin/files', icon: Files }
        ]);
      } catch (err) {
        setError(getErrorMessage(err, '后台总览加载失败'));
      }
    }

    loadMetrics();
  }, []);

  return (
    <section className="admin-dashboard">
      <div className="admin-hero">
        <span className="admin-kicker">GOVERNANCE CONSOLE</span>
        <h1>平台治理控制塔</h1>
        <p>集中处理用户状态、内容审核、评论治理、标签维护和文件生命周期。</p>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-metric-grid">
        {(metrics.length ? metrics : [
          { label: '用户', value: '--', to: '/admin/users', icon: UsersRound },
          { label: '内容', value: '--', to: '/admin/contents', icon: Newspaper },
          { label: '评论', value: '--', to: '/admin/comments', icon: MessageSquareWarning },
          { label: '标签', value: '--', to: '/admin/tags', icon: Tags },
          { label: '文件', value: '--', to: '/admin/files', icon: Files }
        ]).map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} className="admin-metric-card" to={metric.to}>
              <Icon size={25} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
