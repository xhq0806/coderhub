// pages/admin/AdminFilesPage.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCcw, Trash2 } from 'lucide-react';
import { deleteAdminFile, listAdminFiles } from '../../api/admin';
import type { FileItem, FileUsageType, PageResult } from '../../api/types';
import { AdminActions, AdminStatusBadge, AdminTable } from '../../components/AdminTable';
import { getErrorMessage, isForbiddenError } from '../../lib/errors';
import { confirmDanger } from '../../lib/feedback';
import { formatDate } from '../../lib/format';
import { resolveAssetUrl } from '../../lib/request';

const pageSize = 10;

export function AdminFilesPage() {
  const [page, setPage] = useState(1);
  const [usageType, setUsageType] = useState<FileUsageType | ''>('');
  const [result, setResult] = useState<PageResult<FileItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadFiles() {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      setResult(await listAdminFiles({ page, pageSize, usageType }));
    } catch (err) {
      // 后台接口返回 -1006 时切换到明确无权限状态，而不是普通加载失败。
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, '文件列表加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, [page, usageType]);

  async function removeFile(file: FileItem) {
    if (!(await confirmDanger('确认删除该文件？删除后旧 URL 不再可访问。'))) return;
    setNotice('');
    try {
      await deleteAdminFile(file.id);
      setNotice(`文件 #${file.id} 已删除`);
      await loadFiles();
    } catch (err) {
      setError(getErrorMessage(err, '删除文件失败'));
    }
  }

  return (
    <AdminTable
      title="文件治理"
      description="查看上传文件、预览图片并删除违规资源。"
      loading={loading}
      error={error}
      empty={!result?.list.length}
      page={result?.page ?? page}
      pageSize={result?.pageSize ?? pageSize}
      total={result?.total ?? 0}
      onPageChange={setPage}
      onRetry={loadFiles}
      forbidden={forbidden}
      toolbar={(
        <>
          <select className="admin-select" value={usageType} onChange={(event) => { setPage(1); setUsageType(event.target.value as FileUsageType | ''); }}>
            <option value="">全部用途</option>
            <option value="avatar">avatar</option>
            <option value="content_image">content_image</option>
          </select>
          <button className="button admin-ghost" type="button" onClick={loadFiles}><RefreshCcw size={17} />刷新</button>
        </>
      )}
    >
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>预览</th>
            <th>用户</th>
            <th>用途</th>
            <th>文件名</th>
            <th>状态</th>
            <th>大小</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {result?.list.map((file) => (
            <tr key={file.id}>
              <td>#{file.id}</td>
              <td><img className="admin-file-thumb" src={resolveAssetUrl(file.url)} alt={file.originalName || file.filename} loading="lazy" decoding="async" /></td>
              <td>用户 #{file.userId}</td>
              <td>{file.usageType}</td>
              <td className="admin-copy">{file.originalName || file.filename}</td>
              <td><AdminStatusBadge value={file.status} /></td>
              <td>{Math.round(file.size / 1024)} KB</td>
              <td>{formatDate(file.createdAt)}</td>
              <td>
                <AdminActions>
                  <a className="button admin-ghost" href={resolveAssetUrl(file.url)} target="_blank" rel="noreferrer"><ExternalLink size={16} />预览</a>
                  {file.status !== 'deleted' ? <button className="button admin-danger" type="button" onClick={() => removeFile(file)}><Trash2 size={16} />删除</button> : null}
                </AdminActions>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTable>
  );
}
