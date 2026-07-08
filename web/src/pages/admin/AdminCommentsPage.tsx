import { useEffect, useState } from 'react';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { deleteAdminComment, listAdminComments } from '../../api/admin';
import type { CommentItem, PageResult } from '../../api/types';
import { AdminActions, AdminStatusBadge, AdminTable } from '../../components/AdminTable';
import { getErrorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';

const pageSize = 10;

export function AdminCommentsPage() {
  const [page, setPage] = useState(1);
  const [contentId, setContentId] = useState('');
  const [queryContentId, setQueryContentId] = useState<number | undefined>();
  const [result, setResult] = useState<PageResult<CommentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadComments() {
    setLoading(true);
    setError('');
    try {
      setResult(await listAdminComments({ page, pageSize, contentId: queryContentId }));
    } catch (err) {
      setError(getErrorMessage(err, '评论列表加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [page, queryContentId]);

  function applyFilter() {
    const parsed = Number(contentId);
    setPage(1);
    setQueryContentId(Number.isInteger(parsed) && parsed > 0 ? parsed : undefined);
  }

  async function removeComment(comment: CommentItem) {
    if (!window.confirm('确认删除该评论？')) return;
    setNotice('');
    try {
      await deleteAdminComment(comment.id);
      setNotice(`评论 #${comment.id} 已删除`);
      await loadComments();
    } catch (err) {
      setError(getErrorMessage(err, '删除评论失败'));
    }
  }

  return (
    <AdminTable
      title="评论治理"
      description="按内容定位评论，删除违规或无效互动。"
      loading={loading}
      error={error}
      empty={!result?.list.length}
      page={result?.page ?? page}
      pageSize={result?.pageSize ?? pageSize}
      total={result?.total ?? 0}
      onPageChange={setPage}
      onRetry={loadComments}
      toolbar={(
        <>
          <input className="admin-input" value={contentId} placeholder="内容 ID" onChange={(event) => setContentId(event.target.value)} />
          <button className="button admin-primary" type="button" onClick={applyFilter}>筛选</button>
          <button className="button admin-ghost" type="button" onClick={loadComments}><RefreshCcw size={17} />刷新</button>
        </>
      )}
    >
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>内容</th>
            <th>作者</th>
            <th>父评论</th>
            <th>正文</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {result?.list.map((comment) => (
            <tr key={comment.id}>
              <td>#{comment.id}</td>
              <td>#{comment.contentId}</td>
              <td>用户 #{comment.userId}</td>
              <td>{comment.parentId ? '#' + comment.parentId : '-'}</td>
              <td className="admin-copy">{comment.body}</td>
              <td><AdminStatusBadge value={comment.status} /></td>
              <td>{formatDate(comment.createdAt)}</td>
              <td>
                <AdminActions>
                  {comment.status !== 'deleted' ? <button className="button admin-danger" type="button" onClick={() => removeComment(comment)}><Trash2 size={16} />删除</button> : null}
                </AdminActions>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTable>
  );
}
