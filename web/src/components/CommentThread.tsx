// by AI.Coding：单个评论楼层负责按需加载回复、回复任意楼层成员和权限删除。
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Reply, Send, Trash2 } from 'lucide-react';
import { createReply, deleteComment, listReplies } from '../api/comments';
import type { CommentItem } from '../api/types';
import { getErrorMessage } from '../lib/errors';
import { confirmDanger } from '../lib/feedback';
import { formatDate } from '../lib/format';
import { queryKeys } from '../lib/queryKeys';
import { useToast } from './ToastProvider';

interface CommentThreadProps {
  comment: CommentItem;
  contentId: number;
  contentUserId: number;
  currentUserId?: number;
  requireLogin: () => boolean;
  onRootChanged: () => Promise<void> | void;
}

const replyPageSize = 10;

// by AI.Coding：回复分页仅在用户展开楼层后启用，避免顶级评论页产生 N+1 请求。
export function CommentThread({ comment, contentId, contentUserId, currentUserId, requireLogin, onRootChanged }: CommentThreadProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const repliesQuery = useInfiniteQuery({
    queryKey: queryKeys.comments.replies(comment.id),
    queryFn: ({ pageParam }) => listReplies(comment.id, { page: pageParam, pageSize: replyPageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: expanded
  });
  const replies = repliesQuery.data?.pages.flatMap((page) => page.list) ?? [];

  // by AI.Coding：回复某条子回复仍以该条为通知目标，后端负责归一到当前根评论。
  async function submitReply(targetId: number) {
    if (!requireLogin()) return;
    const body = replyBody.trim();
    if (!body) {
      setError('回复内容不能为空');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createReply(targetId, { body });
      setReplyBody('');
      setReplyingId(null);
      setExpanded(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(comment.id) });
      await onRootChanged();
      toast.success('回复已发布。');
    } catch (err) {
      const message = getErrorMessage(err, '回复失败');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // by AI.Coding：删除根评论刷新顶级列表；删除回复仅刷新当前楼层回复缓存。
  async function removeComment(item: CommentItem) {
    if (!requireLogin() || !(await confirmDanger('确定要删除这条评论吗？'))) return;
    setSubmitting(true);
    setError('');
    try {
      await deleteComment(item.id);
      if (item.parentId) await queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(comment.id) });
      await onRootChanged();
      toast.success('评论已删除。');
    } catch (err) {
      const message = getErrorMessage(err, '删除评论失败');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // by AI.Coding：评论卡片复用同一展示结构，子回复保持清晰缩进。
  function renderComment(item: CommentItem, nested = false) {
    const canDelete = Boolean(currentUserId && (currentUserId === item.userId || currentUserId === contentUserId));
    return (
      <article key={item.id} className={'comment-item' + (nested ? ' reply' : '')}>
        <div className="comment-meta"><span>用户 #{item.userId}</span><span>{formatDate(item.createdAt)}</span></div>
        <p className="comment-body">{item.body}</p>
        <div className="card-actions">
          <button className="button ghost" type="button" onClick={() => requireLogin() && setReplyingId(item.id)}><Reply size={16} />回复</button>
          {canDelete ? <button className="button danger icon-button" type="button" disabled={submitting} onClick={() => removeComment(item)} aria-label="删除评论" title="删除评论"><Trash2 size={16} /></button> : null}
        </div>
        {replyingId === item.id ? <div className="reply-form"><textarea className="textarea" value={replyBody} maxLength={500} placeholder="写下回复" onChange={(event) => setReplyBody(event.target.value)} /><div className="form-actions"><button className="button primary" type="button" disabled={submitting} onClick={() => submitReply(item.id)}><Send size={17} />提交回复</button><button className="button ghost" type="button" onClick={() => setReplyingId(null)}>取消</button></div></div> : null}
      </article>
    );
  }

  return (
    <div className="comment-thread">
      {renderComment(comment)}
      {(comment.replyCount ?? 0) > 0 && !expanded ? <button className="button ghost thread-toggle" type="button" onClick={() => setExpanded(true)}>查看 {comment.replyCount} 条回复</button> : null}
      {expanded ? <div className="reply-list">{repliesQuery.isPending ? <p className="muted">正在加载回复...</p> : null}{replies.map((reply) => renderComment(reply, true))}{repliesQuery.hasNextPage ? <button className="button ghost thread-toggle" type="button" disabled={repliesQuery.isFetchingNextPage} onClick={() => repliesQuery.fetchNextPage()}>{repliesQuery.isFetchingNextPage ? '加载中...' : '加载更多回复'}</button> : null}</div> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
