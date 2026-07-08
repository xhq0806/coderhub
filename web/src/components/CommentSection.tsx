import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Reply, Send, Trash2 } from 'lucide-react';
import { createComment, createReply, deleteComment } from '../api/comments';
import type { CommentItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../lib/errors';
import { formatDate } from '../lib/format';

interface CommentSectionProps {
  contentId: number;
  contentUserId: number;
  comments: CommentItem[];
  onChanged: () => Promise<void> | void;
}

export function CommentSection({ contentId, contentUserId, comments, onChanged }: CommentSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [body, setBody] = useState('');
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function requireLogin() {
    if (user) return true;
    navigate('/login', { state: { from: location.pathname + location.search } });
    return false;
  }

  async function handleSubmit() {
    if (!requireLogin()) return;
    const nextBody = body.trim();
    if (!nextBody) {
      setError('评论内容不能为空');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createComment(contentId, { body: nextBody });
      setBody('');
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, '发表评论失败'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(commentId: number) {
    if (!requireLogin()) return;
    const nextBody = replyBody.trim();
    if (!nextBody) {
      setError('回复内容不能为空');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createReply(commentId, { body: nextBody });
      setReplyBody('');
      setReplyingId(null);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, '回复失败'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    if (!requireLogin()) return;
    setSubmitting(true);
    setError('');
    try {
      await deleteComment(commentId);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, '删除评论失败'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="surface">
      <div className="page-header">
        <div>
          <h1><MessageCircle size={26} />评论</h1>
          <p className="muted">{comments.length} 条可见评论</p>
        </div>
      </div>
      <div className="form-grid">
        <textarea className="textarea" value={body} placeholder="写下你的评论" onChange={(event) => setBody(event.target.value)} />
        <div className="form-actions">
          <button className="button primary" type="button" disabled={submitting} onClick={handleSubmit}><Send size={17} />发表评论</button>
          {error ? <span className="form-error">{error}</span> : null}
        </div>
      </div>
      <div className="comment-list">
        {comments.length === 0 ? <p className="muted">暂无评论</p> : null}
        {comments.map((comment) => {
          const canDelete = Boolean(user && (user.id === comment.userId || user.id === contentUserId));
          return (
            <article key={comment.id} className={'comment-item' + (comment.parentId ? ' reply' : '')}>
              <div className="comment-meta">
                <span>用户 #{comment.userId}{comment.parentId ? ' 回复 #' + comment.parentId : ''}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="comment-body">{comment.body}</p>
              <div className="card-actions">
                <button className="button ghost" type="button" onClick={() => requireLogin() && setReplyingId(comment.id)}><Reply size={16} />回复</button>
                {canDelete ? <button className="button danger icon-button" type="button" disabled={submitting} onClick={() => handleDelete(comment.id)} aria-label="删除评论" title="删除评论"><Trash2 size={16} /></button> : null}
              </div>
              {replyingId === comment.id ? (
                <div className="reply-form">
                  <textarea className="textarea" value={replyBody} placeholder="写下回复" onChange={(event) => setReplyBody(event.target.value)} />
                  <div className="form-actions">
                    <button className="button primary" type="button" disabled={submitting} onClick={() => handleReply(comment.id)}><Send size={17} />提交回复</button>
                    <button className="button ghost" type="button" onClick={() => setReplyingId(null)}>取消</button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
