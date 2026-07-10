// by AI.Coding：动态详情页使用 React Query 缓存公开详情和评论分页。
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Tags, UserRound } from 'lucide-react';
import { InteractionBar } from '../components/InteractionBar';
import { listComments } from '../api/comments';
import { getPublishedContent } from '../api/contents';
import { CommentSection } from '../components/CommentSection';
import { StatusView } from '../components/StatusView';
import { getErrorMessage } from '../lib/errors';
import { formatDate } from '../lib/format';
import { ApiError, resolveAssetUrl } from '../lib/request';
import { queryKeys } from '../lib/queryKeys';

const commentPageSize = 10;

// by AI.Coding：详情和评论使用独立查询，评论失败不会阻塞正文展示。
export function DetailPage() {
  const params = useParams();
  const contentId = Number(params.id);
  const validContentId = Number.isInteger(contentId) && contentId > 0;
  const [commentPage, setCommentPage] = useState(1);
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: queryKeys.contents.detail(contentId),
    queryFn: () => getPublishedContent(contentId),
    enabled: validContentId
  });
  const commentsQuery = useQuery({
    queryKey: queryKeys.comments.roots(contentId, commentPage, commentPageSize),
    queryFn: () => listComments(contentId, { page: commentPage, pageSize: commentPageSize }),
    enabled: validContentId && Boolean(detailQuery.data),
    placeholderData: keepPreviousData
  });

  // by AI.Coding：新增顶级评论后回到第一页并刷新评论缓存。
  async function resetComments() {
    if (commentPage !== 1) setCommentPage(1);
    await queryClient.invalidateQueries({ queryKey: ['comments', 'roots', contentId] });
  }

  // by AI.Coding：当前页删除最后一条时回退页码，否则直接刷新当前缓存。
  async function retryComments() {
    const result = commentsQuery.data;
    if (result && result.list.length <= 1 && result.total > 1 && commentPage > 1) setCommentPage((current) => current - 1);
    await commentsQuery.refetch();
  }

  if (!validContentId || (detailQuery.error instanceof ApiError && detailQuery.error.code === -1007)) return <StatusView state="not-found" title="内容不存在" message="该动态不存在或尚未公开。" action={<Link className="button primary" to="/">返回首页</Link>} />;
  if (detailQuery.isPending) return <StatusView state="loading" title="正在加载详情" />;
  if (detailQuery.error) return <StatusView state="error" title="加载失败" message={getErrorMessage(detailQuery.error, '动态详情加载失败')} action={<button className="button primary" type="button" onClick={() => detailQuery.refetch()}>重试</button>} />;
  const content = detailQuery.data;
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
        {content.files.length > 0 ? <div className="image-grid">{content.files.map((file) => <img key={file.id} src={resolveAssetUrl(file.url)} alt={'动态图片 #' + file.id} loading="lazy" decoding="async" />)}</div> : null}
        <InteractionBar content={content} />
      </article>
      <CommentSection
        contentId={content.id}
        contentUserId={content.userId}
        result={commentsQuery.data ?? null}
        loading={commentsQuery.isPending || commentsQuery.isFetching}
        error={commentsQuery.error ? getErrorMessage(commentsQuery.error, '评论加载失败') : ''}
        onPageChange={setCommentPage}
        onChanged={resetComments}
        onRetry={retryComments}
      />
    </div>
  );
}
