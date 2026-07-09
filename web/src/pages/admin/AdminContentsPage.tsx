// pages/admin/AdminContentsPage.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { useEffect, useState } from 'react';
import { CheckCircle2, FileX2, RefreshCcw, SendToBack, Trash2 } from 'lucide-react';
import { approveAdminContent, deleteAdminContent, listAdminContents, offlineAdminContent, rejectAdminContent } from '../../api/admin';
import type { ContentItem, ContentStatus, PageResult } from '../../api/types';
import { AdminActions, AdminStatusBadge, AdminTable } from '../../components/AdminTable';
import { getErrorMessage, isForbiddenError } from '../../lib/errors';
import { formatDate } from '../../lib/format';

const pageSize = 10;

export function AdminContentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [result, setResult] = useState<PageResult<ContentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadContents() {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      setResult(await listAdminContents({ page, pageSize, status }));
    } catch (err) {
      // 后台接口返回 -1006 时切换到明确无权限状态，而不是普通加载失败。
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, '内容列表加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContents();
  }, [page, status]);

  async function runAction(action: () => Promise<ContentItem>, message: string) {
    setNotice('');
    try {
      await action();
      setNotice(message);
      await loadContents();
    } catch (err) {
      setError(getErrorMessage(err, '内容治理操作失败'));
    }
  }

  function rejectContent(content: ContentItem) {
    const reason = window.prompt('请输入驳回原因');
    if (!reason?.trim()) {
      setError('驳回原因不能为空');
      return;
    }
    runAction(() => rejectAdminContent(content.id, reason.trim()), `内容 #${content.id} 已驳回`);
  }

  return (
    <AdminTable
      title="内容审核"
      description="审核待发布内容，并对已公开内容执行下架或删除。"
      loading={loading}
      error={error}
      empty={!result?.list.length}
      page={result?.page ?? page}
      pageSize={result?.pageSize ?? pageSize}
      total={result?.total ?? 0}
      onPageChange={setPage}
      onRetry={loadContents}
      forbidden={forbidden}
      toolbar={(
        <>
          <select className="admin-select" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as ContentStatus | ''); }}>
            <option value="">全部状态</option>
            <option value="pending">pending</option>
            <option value="published">published</option>
            <option value="rejected">rejected</option>
            <option value="offline">offline</option>
            <option value="deleted">deleted</option>
          </select>
          <button className="button admin-ghost" type="button" onClick={loadContents}><RefreshCcw size={17} />刷新</button>
        </>
      )}
    >
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>作者</th>
            <th>正文</th>
            <th>状态</th>
            <th>驳回原因</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {result?.list.map((content) => (
            <tr key={content.id}>
              <td>#{content.id}</td>
              <td>用户 #{content.userId}</td>
              <td className="admin-copy">{content.body || '图片动态'}</td>
              <td><AdminStatusBadge value={content.status} /></td>
              <td>{content.rejectReason || '-'}</td>
              <td>{formatDate(content.createdAt)}</td>
              <td>
                <AdminActions>
                  {content.status === 'pending' ? <button className="button admin-primary" type="button" onClick={() => runAction(() => approveAdminContent(content.id), `内容 #${content.id} 已审核通过`)}><CheckCircle2 size={16} />通过</button> : null}
                  {content.status === 'pending' ? <button className="button admin-warn" type="button" onClick={() => rejectContent(content)}><SendToBack size={16} />驳回</button> : null}
                  {content.status === 'published' ? <button className="button admin-warn" type="button" onClick={() => runAction(() => offlineAdminContent(content.id), `内容 #${content.id} 已下架`)}><FileX2 size={16} />下架</button> : null}
                  {content.status !== 'deleted' ? <button className="button admin-danger" type="button" onClick={() => window.confirm('确认删除该内容？') && runAction(() => deleteAdminContent(content.id), `内容 #${content.id} 已删除`)}><Trash2 size={16} />删除</button> : null}
                </AdminActions>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTable>
  );
}
