// components/InteractionBar.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { Heart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ContentInteractionState, ContentItem } from '../api/types';
import { favoriteContent, likeContent, unfavoriteContent, unlikeContent } from '../api/interactions';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../lib/errors';

interface InteractionBarProps {
  content: Pick<ContentItem, 'id' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'viewerLiked' | 'viewerFavorited'>;
  onChanged?: (state: ContentInteractionState) => void;
}

// 互动条统一处理点赞收藏按钮、计数展示和未登录跳转。
export function InteractionBar({ content, onChanged }: InteractionBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ContentInteractionState>({
    contentId: content.id,
    likeCount: content.likeCount ?? 0,
    favoriteCount: content.favoriteCount ?? 0,
    commentCount: content.commentCount ?? 0,
    viewerLiked: Boolean(content.viewerLiked),
    viewerFavorited: Boolean(content.viewerFavorited)
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 未登录互动统一回到登录流程，并保留当前入口。
  function requireLogin() {
    if (user) return true;
    navigate('/login', { state: { from: window.location.pathname + window.location.search } });
    return false;
  }

  // 以服务端最终状态刷新局部计数，避免前端乐观更新造成偏差。
  async function runAction(action: () => Promise<ContentInteractionState>) {
    if (!requireLogin() || busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await action();
      setState(next);
      onChanged?.(next);
    } catch (err) {
      setError(getErrorMessage(err, '互动操作失败'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="interaction-bar" onClick={(event) => event.preventDefault()}>
      <button className={'interaction-button' + (state.viewerLiked ? ' active like' : '')} type="button" disabled={busy} aria-label={state.viewerLiked ? '取消点赞' : '点赞'} onClick={() => runAction(() => state.viewerLiked ? unlikeContent(content.id) : likeContent(content.id))}>
        <Heart size={16} />赞 {state.likeCount}
      </button>
      <button className={'interaction-button' + (state.viewerFavorited ? ' active favorite' : '')} type="button" disabled={busy} aria-label={state.viewerFavorited ? '取消收藏' : '收藏'} onClick={() => runAction(() => state.viewerFavorited ? unfavoriteContent(content.id) : favoriteContent(content.id))}>
        <Star size={16} />收藏 {state.favoriteCount}
      </button>
      <span className="interaction-count">评论 {state.commentCount}</span>
      {error ? <span className="interaction-error">{error}</span> : null}
    </div>
  );
}
