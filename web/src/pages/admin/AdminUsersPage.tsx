import { useEffect, useState } from 'react';
import { CheckCircle2, CircleSlash, RefreshCcw } from 'lucide-react';
import { disableAdminUser, enableAdminUser, listAdminUsers } from '../../api/admin';
import type { PageResult, UserProfile, UserStatus } from '../../api/types';
import { AdminActions, AdminStatusBadge, AdminTable } from '../../components/AdminTable';
import { getErrorMessage, isForbiddenError } from '../../lib/errors';
import { formatDate } from '../../lib/format';

const pageSize = 10;

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [result, setResult] = useState<PageResult<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      setResult(await listAdminUsers({ page, pageSize, status }));
    } catch (err) {
      // by AI.Coding：后台接口返回 -1006 时切换到明确无权限状态，而不是普通加载失败。
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, '用户列表加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [page, status]);

  async function updateStatus(user: UserProfile, nextStatus: UserStatus) {
    setNotice('');
    try {
      if (nextStatus === 'disabled') await disableAdminUser(user.id);
      else await enableAdminUser(user.id);
      setNotice(`用户 ${user.name} 已${nextStatus === 'disabled' ? '禁用' : '恢复'}`);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, '用户状态更新失败'));
    }
  }

  return (
    <AdminTable
      title="用户管理"
      description="分页查看账号状态，对异常账号执行禁用或恢复。"
      loading={loading}
      error={error}
      empty={!result?.list.length}
      page={result?.page ?? page}
      pageSize={result?.pageSize ?? pageSize}
      total={result?.total ?? 0}
      onPageChange={setPage}
      onRetry={loadUsers}
      forbidden={forbidden}
      toolbar={(
        <>
          <select className="admin-select" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as UserStatus | ''); }}>
            <option value="">全部状态</option>
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
          <button className="button admin-ghost" type="button" onClick={loadUsers}><RefreshCcw size={17} />刷新</button>
        </>
      )}
    >
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>账号</th>
            <th>昵称</th>
            <th>角色</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {result?.list.map((user) => (
            <tr key={user.id}>
              <td>#{user.id}</td>
              <td>{user.name}</td>
              <td>{user.nickname || '-'}</td>
              <td>{user.role}</td>
              <td><AdminStatusBadge value={user.status} /></td>
              <td>{formatDate(user.createdAt)}</td>
              <td>
                <AdminActions>
                  {user.status === 'active' ? (
                    <button className="button admin-danger" type="button" onClick={() => updateStatus(user, 'disabled')}><CircleSlash size={16} />禁用</button>
                  ) : (
                    <button className="button admin-primary" type="button" onClick={() => updateStatus(user, 'active')}><CheckCircle2 size={16} />恢复</button>
                  )}
                </AdminActions>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTable>
  );
}
