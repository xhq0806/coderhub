// pages/NotificationsPage.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import type { NotificationItem, PageResult } from '../api/types';
import { Pagination } from '../components/Pagination';
import { StatusView } from '../components/StatusView';
import { useToast } from '../components/ToastProvider';
import { useUnreadNotifications } from '../notifications/UnreadNotificationContext';
import { getErrorMessage } from '../lib/errors';
import { confirmDanger } from '../lib/feedback';
import { formatDate } from '../lib/format';

const pageSize = 10;

// 通知页展示当前用户事件收件台，并支持单条或全部已读。
export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<NotificationItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { refreshUnreadCount } = useUnreadNotifications();
  const toast = useToast();

  // 分页加载通知，按服务端创建时间倒序展示。
  async function loadNotifications() {
    setLoading(true);
    setError('');
    try {
      setResult(await listNotifications({ page, pageSize }));
    } catch (err) {
      setError(getErrorMessage(err, '通知加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [page]);

  // 根据通知目标类型生成可访问跳转地址。
  function targetLink(item: NotificationItem) {
    if (item.type === 'content_rejected') return '/my/contents';
    if (item.targetType === 'user') return '/users/' + item.targetId;
    if (item.targetType === 'content') return '/contents/' + item.targetId;
    if (item.targetType === 'comment') return '/notifications';
    return '/notifications';
  }

  // 标记单条通知已读后刷新列表和顶部未读角标。
  async function markRead(id: number) {
    try {
      await markNotificationRead(id);
      await loadNotifications();
      await refreshUnreadCount();
      toast.success('通知已标为已读。');
    } catch (err) {
      const message = getErrorMessage(err, '标记已读失败');
      setError(message);
      toast.error(message);
    }
  }

  // 全部已读前进行确认，成功后同步顶部角标。
  async function markAllRead() {
    if (!confirmDanger('确定要将全部通知标为已读吗？')) return;
    try {
      await markAllNotificationsRead();
      await loadNotifications();
      await refreshUnreadCount();
      toast.success('全部通知已标为已读。');
    } catch (err) {
      const message = getErrorMessage(err, '全部已读失败');
      setError(message);
      toast.error(message);
    }
  }

  return (
    <section className="page-stack">
      <div className="home-hero signal-hero"><div><span className="module-label"><Bell size={16} />SIGNAL INBOX</span><h1>通知</h1><p>与你的内容、互动和关系有关的事件会汇集在这里。</p></div><button className="button primary" type="button" onClick={markAllRead}><CheckCheck size={17} />全部已读</button></div>
      {loading ? <StatusView state="loading" title="正在加载通知" /> : null}
      {!loading && error ? <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={loadNotifications}>重试</button>} /> : null}
      {!loading && !error && result?.list.length === 0 ? <StatusView state="empty" title="暂无通知" message="当你的内容产生反馈时，会在这里看到信号。" /> : null}
      {!loading && !error && result && result.list.length > 0 ? <div className="notification-list">{result.list.map((item) => <article key={item.id} className={'notification-card ' + item.status}><span className="notification-dot" /> <div><Link to={targetLink(item)}><strong>{item.title}</strong></Link><p>{item.body || '点击查看相关内容。'}</p><small>{formatDate(item.createdAt)}</small></div>{item.status === 'unread' ? <button className="button ghost" type="button" onClick={() => markRead(item.id)}>标为已读</button> : null}</article>)}<Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} /></div> : null}
    </section>
  );
}
