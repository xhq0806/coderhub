// by AI.Coding：评论区负责顶级评论发布、分页和登录回跳，楼层回复交给 CommentThread。
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import { createComment } from '../api/comments';
import type { CommentItem, PageResult } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { Pagination } from './Pagination';
import { StatusView } from './StatusView';
import { useToast } from './ToastProvider';
import { CommentThread } from './CommentThread';
import { getErrorMessage } from '../lib/errors';
import { validateCommentBody } from '../lib/validation';

interface CommentSectionProps {
  contentId: number;
  contentUserId: number;
  result: PageResult<CommentItem> | null;
  loading: boolean;
  error: string;
  onPageChange: (page: number) => void;
  onChanged: () => Promise<void> | void;
  onRetry: () => Promise<void> | void;
}

// by AI.Coding：顶级评论提交成功后刷新第一页，各楼层按需加载自己的回复。
export function CommentSection({ contentId, contentUserId, result, loading, error, onPageChange, onChanged, onRetry }: CommentSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // by AI.Coding：评论类操作必须登录，未登录时保留当前路径用于登录回跳。
  function requireLogin() {
    if (user) return true;
    navigate('/login', { state: { from: location.pathname + location.search } });
    return false;
  }

  // by AI.Coding：发布顶级评论前执行统一校验，成功后清空输入并刷新列表。
  async function handleSubmit() {
    if (!requireLogin()) return;
    const nextBody = body.trim();
    const validationError = validateCommentBody(nextBody);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createComment(contentId, { body: nextBody });
      setBody('');
      await onChanged();
      toast.success('评论已发布。');
    } catch (err) {
      const message = getErrorMessage(err, '发表评论失败');
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const comments = result?.list ?? [];
  return (
    <section className="surface">
      <div className="page-header"><div><h1><MessageCircle size={26} />评论</h1><p className="muted">{result?.total ?? 0} 个评论楼层</p></div></div>
      <div className="form-grid"><textarea className="textarea" value={body} maxLength={500} placeholder="写下你的评论" onChange={(event) => setBody(event.target.value)} /><div className="form-actions"><button className="button primary" type="button" disabled={submitting} onClick={handleSubmit}><Send size={17} />发表评论</button>{formError ? <span className="form-error">{formError}</span> : null}</div></div>
      {loading ? <StatusView state="loading" title="正在加载评论" /> : null}
      {!loading && error ? <StatusView state="error" title="评论加载失败" message={error} action={<button className="button primary" type="button" onClick={onRetry}>重试</button>} /> : null}
      {!loading && !error ? <div className="comment-list">{comments.length === 0 ? <p className="muted">暂无评论</p> : null}{comments.map((comment) => <CommentThread key={comment.id} comment={comment} contentId={contentId} contentUserId={contentUserId} currentUserId={user?.id} requireLogin={requireLogin} onRootChanged={onRetry} />)}{result ? <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={onPageChange} /> : null}</div> : null}
    </section>
  );
}
