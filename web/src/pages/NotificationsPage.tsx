// by AI.Coding：通知页通过 React Query 共享列表与未读缓存，已读操作统一失效相关查询。
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import type { NotificationItem } from '../api/types';
import { Pagination } from '../components/Pagination';
import { StatusView } from '../components/StatusView';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../lib/errors';
import { confirmDanger } from '../lib/feedback';
import { formatDate } from '../lib/format';
import { queryKeys } from '../lib/queryKeys';

const pageSize = 10;

// by AI.Coding：通知列表 query key 包含用户与页码，避免账号切换复用私有数据。
export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const filters = { page, pageSize };
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list(user?.id ?? 0, filters),
    queryFn: () => listNotifications(filters),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    meta: { private: true }
  });

  // by AI.Coding：已读操作成功后同时刷新通知列表和顶部未读数。
  async function invalidateNotifications() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
      user ? queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread(user.id) }) : Promise.resolve()
    ]);
  }

  const markReadMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidateNotifications });
  const markAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidateNotifications });

  // by AI.Coding：根据通知目标类型生成站内跳转地址。
  function targetLink(item: NotificationItem) {
    if (item.type === 'content_rejected') return '/my/contents';
    if (item.targetType === 'user') return '/users/' + item.targetId;
    if (item.targetType === 'content') return '/contents/' + item.targetId;
    return '/notifications';
  }

  // by AI.Coding：单条已读使用 mutation 防止重复请求并展示统一反馈。
  async function markRead(id: number) {
    try {
      await markReadMutation.mutateAsync(id);
      toast.success('通知已标为已读。');
    } catch (err) {
      toast.error(getErrorMessage(err, '标记已读失败'));
    }
  }

  // by AI.Coding：全部已读必须先通过异步危险确认 Dialog。
  async function markAllRead() {
    if (!(await confirmDanger('确定要将全部通知标为已读吗？'))) return;
    try {
      await markAllMutation.mutateAsync();
      toast.success('全部通知已标为已读。');
    } catch (err) {
      toast.error(getErrorMessage(err, '全部已读失败'));
    }
  }

  const result = notificationsQuery.data;
  const error = notificationsQuery.error ? getErrorMessage(notificationsQuery.error, '通知加载失败') : '';

  return (
    <section className="page-stack">
      <div className="home-hero signal-hero"><div><span className="module-label"><Bell size={16} />SIGNAL INBOX</span><h1>通知</h1><p>与你的内容、互动和关系有关的事件会汇集在这里。</p></div><button className="button primary" type="button" disabled={markAllMutation.isPending} onClick={markAllRead}><CheckCheck size={17} />全部已读</button></div>
      {notificationsQuery.isPending ? <StatusView state="loading" title="正在加载通知" /> : null}
      {!notificationsQuery.isPending && error ? <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={() => notificationsQuery.refetch()}>重试</button>} /> : null}
      {!notificationsQuery.isPending && !error && result?.list.length === 0 ? <StatusView state="empty" title="暂无通知" message="当你的内容产生反馈时，会在这里看到信号。" /> : null}
      {!notificationsQuery.isPending && !error && result && result.list.length > 0 ? <div className="notification-list">{result.list.map((item) => <article key={item.id} className={'notification-card ' + item.status}><span className="notification-dot" /><div><Link to={targetLink(item)}><strong>{item.title}</strong></Link><p>{item.body || '点击查看相关内容。'}</p><small>{formatDate(item.createdAt)}</small></div>{item.status === 'unread' ? <button className="button ghost" type="button" disabled={markReadMutation.isPending} onClick={() => markRead(item.id)}>标为已读</button> : null}</article>)}<Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} /></div> : null}
    </section>
  );
}
