import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, PenLine, Send, Tags } from 'lucide-react';
import { createContent } from '../api/contents';
import { uploadContentImage } from '../api/files';
import { listTags } from '../api/tags';
import type { FileItem, TagItem } from '../api/types';
import { FileUploader } from '../components/FileUploader';
import { getErrorMessage } from '../lib/errors';
import { resolveAssetUrl } from '../lib/request';

export function PublishPage() {
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [images, setImages] = useState<FileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listTags({ page: 1, pageSize: 100 }).then((result) => setTags(result.list)).catch(() => setTags([]));
  }, []);

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) => current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = body.trim();
    if (!nextBody && images.length === 0) {
      setError('正文和图片至少填写一项');
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
    } catch (err) {
      setError(getErrorMessage(err, '发布失败'));
    } finally {
      setSubmitting(false);
    }
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
          <textarea className="textarea" value={body} placeholder="分享今天的进展" onChange={(event) => setBody(event.target.value)} />
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
                <img className="upload-preview" src={resolveAssetUrl(image.url)} alt={image.originalName || '内容图片'} />
                <button className="button danger" type="button" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}>移除</button>
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
