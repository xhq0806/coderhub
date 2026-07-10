// 发布动态页，负责正文、标签、图片上传和发布提交。
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, PenLine, Send, Tags } from 'lucide-react';
import { createContent } from '../api/contents';
import { uploadContentImage } from '../api/files';
import { listTags } from '../api/tags';
import type { FileItem, TagItem } from '../api/types';
import { FileUploader } from '../components/FileUploader';
import { useToast } from '../components/ToastProvider';
import { getErrorMessage } from '../lib/errors';
import { confirmDanger } from '../lib/feedback';
import { resolveAssetUrl } from '../lib/request';
import { validateContentDraft } from '../lib/validation';

// 发布页管理动态草稿、标签选择、图片列表和提交状态。
export function PublishPage() {
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [images, setImages] = useState<FileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    listTags({ page: 1, pageSize: 100 }).then((result) => setTags(result.list)).catch(() => setTags([]));
  }, []);

  // 标签按钮支持多选和取消选择，最终以 ID 列表提交。
  function toggleTag(tagId: number) {
    setSelectedTagIds((current) => current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]);
  }

  // 发布前校验正文和图片不能同时为空，成功后跳转我的内容页查看审核状态。
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = body.trim();
    const validationError = validateContentDraft(nextBody, images.length, selectedTagIds.length);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createContent({
        body: nextBody || undefined,
        tagIds: selectedTagIds,
        fileIds: images.map((image) => image.id)
      });
      navigate('/my/contents?status=pending&created=1');
      toast.success('发布成功，内容正在等待审核。');
    } catch (err) {
      setError(getErrorMessage(err, '发布失败'));
      toast.error(getErrorMessage(err, '发布失败'));
    } finally {
      setSubmitting(false);
    }
  }

  // by AI.Coding：移除已上传图片前使用全局 Dialog 确认，取消时保持草稿不变。
  async function removeImage(imageId: number) {
    if (!(await confirmDanger('确定要从本次发布中移除这张图片吗？'))) return;
    setImages((current) => current.filter((item) => item.id !== imageId));
  }

  return (
    <section className="workspace-grid">
      <aside className="side-note">
        <span className="module-label"><PenLine size={16} />DRAFT</span>
        <h1>发布动态</h1>
        <p>内容会先进入审核队列，公开后才出现在首页。</p>
        <div className="note-list">
          <span><CheckCircle2 size={16} />正文或图片至少一项</span>
          <span><CheckCircle2 size={16} />只使用启用标签</span>
          <span><CheckCircle2 size={16} />图片需先上传</span>
        </div>
      </aside>
      <form className="form-panel form-grid" onSubmit={handleSubmit}>
        <div className="page-header compact-header">
        <div>
          <h1>动态草稿</h1>
          <p className="muted">提交后进入待审核状态</p>
        </div>
      </div>
        <label className="form-field">
          <span>正文</span>
          <textarea className="textarea" value={body} maxLength={1000} placeholder="分享今天的进展" onChange={(event) => setBody(event.target.value)} />
        </label>
        <div>
          <strong className="field-title"><Tags size={17} />标签</strong>
          <div className="tag-row">
            {tags.length === 0 ? <span className="muted">暂无启用标签</span> : null}
            {tags.map((tag) => (
              <button key={tag.id} className={'tag-button' + (selectedTagIds.includes(tag.id) ? ' active' : '')} type="button" onClick={() => toggleTag(tag.id)}>{tag.name}</button>
            ))}
          </div>
        </div>
        <FileUploader label="内容图片" buttonText="上传图片" upload={uploadContentImage} onUploaded={(file) => setImages((current) => [...current, file])} />
        {images.length > 0 ? (
          <div className="uploaded-list">
            {images.map((image) => (
              <div className="uploaded-item" key={image.id}>
                <img className="upload-preview" src={resolveAssetUrl(image.url)} alt={image.originalName || '内容图片'} loading="lazy" decoding="async" />
                <button className="button danger" type="button" onClick={() => removeImage(image.id)}>移除</button>
              </div>
            ))}
          </div>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={submitting}><Send size={17} />{submitting ? '发布中...' : '发布'}</button>
        </div>
      </form>
    </section>
  );
}
