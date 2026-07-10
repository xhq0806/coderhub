// 动态详情页，负责加载公开动态、互动状态和分页评论列表。
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Tags, UserRound } from 'lucide-react';
import { InteractionBar } from '../components/InteractionBar';
import { listComments } from '../api/comments';
import { getPublishedContent } from '../api/contents';
import type { CommentItem, ContentDetail, PageResult } from '../api/types';
import { CommentSection } from '../components/CommentSection';
import { StatusView } from '../components/StatusView';
import { getErrorMessage } from '../lib/errors';
import { formatDate } from '../lib/format';
import { ApiError, resolveAssetUrl } from '../lib/request';

const commentPageSize = 10;

// 详情页根据路由 ID 加载公开动态，并协调评论分页刷新。
export function DetailPage() {
  const params = useParams();
  const contentId = Number(params.id);
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [comments, setComments] = useState<PageResult<CommentItem> | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  // 评论列表按页刷新，供发表评论、回复、删除和分页切换复用。
  const loadComments = useCallback(async (page = commentPage) => {
    if (!Number.isInteger(contentId) || contentId <= 0) return;
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const result = await listComments(contentId, { page, pageSize: commentPageSize });
      setComments(result);
      if (result.list.length === 0 && result.total > 0 && page > 1) setCommentPage(page - 1);
    } catch (err) {
      setCommentsError(getErrorMessage(err, '评论加载失败'));
    } finally {
      setCommentsLoading(false);
    }
  }, [contentId, commentPage]);

  // 详情加载区分不存在和普通错误，便于页面展示准确状态。
  const loadDetail = useCallback(async () => {
    if (!Number.isInteger(contentId) || contentId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setError('');
    try {
      const detail = await getPublishedContent(contentId);
      setContent(detail);
    } catch (err) {
      if (err instanceof ApiError && err.code === -1007) setNotFound(true);
      else setError(getErrorMessage(err, '动态详情加载失败'));
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (content) loadComments(commentPage);
  }, [content, commentPage, loadComments]);

  async function resetComments() {
    if (commentPage !== 1) setCommentPage(1);
    else await loadComments(1);
  }

  if (loading) return <StatusView state="loading" title="正在加载详情" />;
  if (notFound) return <StatusView state="not-found" title="内容不存在" message="该动态不存在或尚未公开。" action={<Link className="button primary" to="/">返回首页</Link>} />;
  if (error) return <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={loadDetail}>重试</button>} />;
  if (!content) return null;

  return (
    <div className="detail-layout">
      <article className="surface">
        <div className="detail-meta">
          <span><UserRound size={16} /><Link to={'/users/' + content.userId}>用户 #{content.userId}</Link></span>
          <span><CalendarDays size={16} />{formatDate(content.createdAt)}</span>
          {content.tags.length ? <span><Tags size={16} />{content.tags.length} 个标签</span> : null}
          {content.tags.map((tag) => <span key={tag.id} className="badge">{tag.name}</span>)}
        </div>
        <div className="detail-body">{content.body || '图片动态'}</div>
        {content.files.length > 0 ? (
          <div className="image-grid">
            {content.files.map((file) => <img key={file.id} src={resolveAssetUrl(file.url)} alt={'动态图片 #' + file.id} loading="lazy" decoding="async" />)}
          </div>
        ) : null}
        <InteractionBar content={content} />
      </article>
      <CommentSection
        contentId={content.id}
        contentUserId={content.userId}
        result={comments}
        loading={commentsLoading}
        error={commentsError}
        onPageChange={setCommentPage}
        onChanged={resetComments}
        onRetry={() => loadComments(commentPage)}
      />
    </div>
  );
}
