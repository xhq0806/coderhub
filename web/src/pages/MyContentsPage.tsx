import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePenLine, PenSquare, Trash2 } from 'lucide-react';
import { deleteMyContent, listMyContents, updateMyContent } from '../api/contents';
import { uploadContentImage } from '../api/files';
import { listTags } from '../api/tags';
import type { ContentItem, ContentStatus, FileItem, PageResult, TagItem } from '../api/types';
import { ContentCard } from '../components/ContentCard';
import { FileUploader } from '../components/FileUploader';
import { Pagination } from '../components/Pagination';
import { StatusView } from '../components/StatusView';
import { getErrorMessage } from '../lib/errors';
import { resolveAssetUrl } from '../lib/request';

const pageSize = 10;
const editableStatuses = new Set<ContentStatus>(['pending', 'rejected']);
const filterStatuses: Array<{ label: string; value: ContentStatus | '' }> = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已公开', value: 'published' },
  { label: '已驳回', value: 'rejected' }
];

interface EditDraft {
  content: ContentItem;
  body: string;
  tagIds: number[];
  files: FileItem[];
  error: string;
  saving: boolean;
}

function isContentStatus(value: string | null): value is ContentStatus {
  return value === 'pending' || value === 'published' || value === 'rejected';
}

export function MyContentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const status = isContentStatus(searchParams.get('status')) ? searchParams.get('status') as ContentStatus : undefined;
  const [contents, setContents] = useState<PageResult<ContentItem> | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(searchParams.get('created') ? '发布成功，内容正在等待审核。' : '');
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  async function loadContents() {
    setLoading(true);
    setError('');
    try {
      const result = await listMyContents({ page, pageSize, status });
      setContents(result);
    } catch (err) {
      setError(getErrorMessage(err, '我的内容加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listTags({ page: 1, pageSize: 100 }).then((result) => setTags(result.list)).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    loadContents();
  }, [page, status]);

  function updateFilter(nextStatus: ContentStatus | '') {
    const next = new URLSearchParams();
    if (nextStatus) next.set('status', nextStatus);
    next.set('page', '1');
    setSearchParams(next);
    setNotice('');
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  function startEdit(content: ContentItem) {
    setEditDraft({ content, body: content.body || '', tagIds: [], files: [], error: '', saving: false });
  }

  function updateEditDraft(next: Partial<EditDraft>) {
    setEditDraft((current) => current ? { ...current, ...next } : current);
  }

  function toggleEditTag(tagId: number) {
    setEditDraft((current) => {
      if (!current) return current;
      const tagIds = current.tagIds.includes(tagId) ? current.tagIds.filter((id) => id !== tagId) : [...current.tagIds, tagId];
      return { ...current, tagIds };
    });
  }

  async function saveEdit() {
    if (!editDraft) return;
    const nextBody = editDraft.body.trim();
    if (!nextBody && editDraft.files.length === 0) {
      updateEditDraft({ error: '正文和图片至少填写一项' });
      return;
    }

    updateEditDraft({ saving: true, error: '' });
    try {
      await updateMyContent(editDraft.content.id, {
        body: nextBody || undefined,
        tagIds: editDraft.tagIds,
        fileIds: editDraft.files.map((file) => file.id)
      });
      setEditDraft(null);
      await loadContents();
      setNotice('内容已重新提交审核。');
    } catch (err) {
      updateEditDraft({ error: getErrorMessage(err, '更新内容失败'), saving: false });
    }
  }

  async function handleDelete(contentId: number) {
    setError('');
    try {
      await deleteMyContent(contentId);
      await loadContents();
      setNotice('内容已删除。');
    } catch (err) {
      setError(getErrorMessage(err, '删除内容失败'));
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <span className="module-label"><FilePenLine size={16} />LIBRARY</span>
          <h1>我的内容</h1>
          <p className="muted">查看审核状态和管理自己的动态</p>
        </div>
        <Link className="button primary" to="/publish"><PenSquare size={18} />发布动态</Link>
      </div>
      <div className="filter-panel">
        {filterStatuses.map((item) => (
          <button key={item.label} className={'tag-button' + ((status || '') === item.value ? ' active' : '')} type="button" onClick={() => updateFilter(item.value)}>{item.label}</button>
        ))}
      </div>
      {notice ? <p className="success-text">{notice}</p> : null}
      {loading ? <StatusView state="loading" title="正在加载我的内容" /> : null}
      {!loading && error ? <StatusView state="error" title="操作失败" message={error} action={<button className="button primary" type="button" onClick={loadContents}>重试</button>} /> : null}
      {!loading && !error && contents?.list.length === 0 ? <StatusView state="empty" title="暂无内容" message="当前状态下没有动态。" /> : null}
      {!loading && !error && contents && contents.list.length > 0 ? (
        <div className="content-manager">
          {contents.list.map((content) => (
            <div key={content.id}>
              <ContentCard
                content={content}
                compact
                actions={(
                  <>
                    {content.status === 'published' ? <Link className="button ghost" to={'/contents/' + content.id}>查看</Link> : null}
                    {editableStatuses.has(content.status) ? <button className="button ghost" type="button" onClick={() => startEdit(content)}><PenSquare size={16} />编辑</button> : null}
                    <button className="button danger icon-button" type="button" onClick={() => handleDelete(content.id)} aria-label="删除内容" title="删除内容"><Trash2 size={16} /></button>
                  </>
                )}
              />
              {editDraft?.content.id === content.id ? (
                <div className="edit-panel form-panel">
                  <label className="form-field">
                    <span>正文</span>
                    <textarea className="textarea" value={editDraft.body} onChange={(event) => updateEditDraft({ body: event.target.value })} />
                  </label>
                  <div>
                    <strong>标签</strong>
                    <div className="tag-row">
                      {tags.map((tag) => (
                        <button key={tag.id} className={'tag-button' + (editDraft.tagIds.includes(tag.id) ? ' active' : '')} type="button" onClick={() => toggleEditTag(tag.id)}>{tag.name}</button>
                      ))}
                    </div>
                  </div>
                  <FileUploader label="内容图片" buttonText="上传新图片" upload={uploadContentImage} onUploaded={(file) => updateEditDraft({ files: [...editDraft.files, file] })} />
                  {editDraft.files.length > 0 ? (
                    <div className="uploaded-list">
                      {editDraft.files.map((file) => (
                        <div className="uploaded-item" key={file.id}>
                          <img className="upload-preview" src={resolveAssetUrl(file.url)} alt={file.originalName || '内容图片'} />
                          <button className="button danger" type="button" onClick={() => updateEditDraft({ files: editDraft.files.filter((item) => item.id !== file.id) })}>移除</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="warning-text">重新提交后状态会回到待审核。</p>
                  {editDraft.error ? <p className="form-error">{editDraft.error}</p> : null}
                  <div className="form-actions">
                    <button className="button primary" type="button" disabled={editDraft.saving} onClick={saveEdit}><FilePenLine size={17} />{editDraft.saving ? '保存中...' : '保存'}</button>
                    <button className="button ghost" type="button" onClick={() => setEditDraft(null)}>取消</button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <Pagination page={contents.page} pageSize={contents.pageSize} total={contents.total} onChange={updatePage} />
        </div>
      ) : null}
    </section>
  );
}
