import { useEffect, useState } from 'react';
import { CheckCircle2, CircleSlash, PenSquare, Plus, RefreshCcw } from 'lucide-react';
import { createAdminTag, disableAdminTag, enableAdminTag, listAdminTags, updateAdminTag } from '../../api/admin';
import type { PageResult, TagItem } from '../../api/types';
import { AdminActions, AdminStatusBadge, AdminTable } from '../../components/AdminTable';
import { getErrorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';

const pageSize = 10;

export function AdminTagsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState<PageResult<TagItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadTags() {
    setLoading(true);
    setError('');
    try {
      setResult(await listAdminTags({ page, pageSize, status }));
    } catch (err) {
      setError(getErrorMessage(err, '标签列表加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTags();
  }, [page, status]);

  async function createTag() {
    const nextName = name.trim();
    if (!nextName) {
      setError('标签名称不能为空');
      return;
    }
    setNotice('');
    try {
      await createAdminTag(nextName);
      setName('');
      setNotice(`标签 ${nextName} 已创建`);
      await loadTags();
    } catch (err) {
      setError(getErrorMessage(err, '创建标签失败'));
    }
  }

  async function renameTag(tag: TagItem) {
    const nextName = window.prompt('请输入新的标签名称', tag.name);
    if (!nextName?.trim()) {
      setError('标签名称不能为空');
      return;
    }
    setNotice('');
    try {
      await updateAdminTag(tag.id, nextName.trim());
      setNotice(`标签 #${tag.id} 已改名`);
      await loadTags();
    } catch (err) {
      setError(getErrorMessage(err, '修改标签失败'));
    }
  }

  async function updateTagStatus(tag: TagItem, action: 'enable' | 'disable') {
    setNotice('');
    try {
      if (action === 'enable') await enableAdminTag(tag.id);
      else await disableAdminTag(tag.id);
      setNotice(`标签 ${tag.name} 已${action === 'enable' ? '启用' : '禁用'}`);
      await loadTags();
    } catch (err) {
      setError(getErrorMessage(err, '标签状态更新失败'));
    }
  }

  return (
    <AdminTable
      title="标签维护"
      description="维护发布可选标签，禁用后不影响历史内容展示。"
      loading={loading}
      error={error}
      empty={!result?.list.length}
      page={result?.page ?? page}
      pageSize={result?.pageSize ?? pageSize}
      total={result?.total ?? 0}
      onPageChange={setPage}
      onRetry={loadTags}
      toolbar={(
        <>
          <input className="admin-input" value={name} placeholder="新标签名称" onChange={(event) => setName(event.target.value)} />
          <button className="button admin-primary" type="button" onClick={createTag}><Plus size={17} />新增</button>
          <select className="admin-select" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            <option value="">全部状态</option>
            <option value="enabled">enabled</option>
            <option value="disabled">disabled</option>
          </select>
          <button className="button admin-ghost" type="button" onClick={loadTags}><RefreshCcw size={17} />刷新</button>
        </>
      )}
    >
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {result?.list.map((tag) => (
            <tr key={tag.id}>
              <td>#{tag.id}</td>
              <td>{tag.name}</td>
              <td><AdminStatusBadge value={tag.status} /></td>
              <td>{formatDate(tag.createdAt)}</td>
              <td>
                <AdminActions>
                  <button className="button admin-ghost" type="button" onClick={() => renameTag(tag)}><PenSquare size={16} />改名</button>
                  {tag.status === 'enabled' ? (
                    <button className="button admin-warn" type="button" onClick={() => updateTagStatus(tag, 'disable')}><CircleSlash size={16} />禁用</button>
                  ) : (
                    <button className="button admin-primary" type="button" onClick={() => updateTagStatus(tag, 'enable')}><CheckCircle2 size={16} />启用</button>
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
