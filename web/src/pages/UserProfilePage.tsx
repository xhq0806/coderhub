// pages/UserProfilePage.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { UserPlus, UserRound } from 'lucide-react';
import { followUser, getUserPublicProfile, unfollowUser } from '../api/follows';
import { listUserContents } from '../api/contents';
import type { ContentItem, PageResult, UserPublicProfile } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ContentCard } from '../components/ContentCard';
import { Pagination } from '../components/Pagination';
import { StatusView } from '../components/StatusView';
import { getErrorMessage } from '../lib/errors';

const pageSize = 10;

// 用户主页承载公开资料、关注关系和该用户已公开动态。
export function UserProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [contents, setContents] = useState<PageResult<ContentItem> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 主页资料和公开动态分开请求，任一失败都显示统一错误状态。
  const loadProfile = useCallback(async () => {
    if (!Number.isInteger(userId) || userId <= 0) return;
    setLoading(true);
    setError('');
    try {
      const [nextProfile, nextContents] = await Promise.all([getUserPublicProfile(userId), listUserContents(userId, { page, pageSize })]);
      setProfile(nextProfile);
      setContents(nextContents);
    } catch (err) {
      setError(getErrorMessage(err, '用户主页加载失败'));
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 关注按钮以服务端返回状态为准，避免计数漂移。
  async function toggleFollow() {
    if (!profile) return;
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    try {
      const state = profile.viewerFollowing ? await unfollowUser(userId) : await followUser(userId);
      setProfile({ ...profile, ...state });
    } catch (err) {
      setError(getErrorMessage(err, '关注操作失败'));
    }
  }

  if (loading) return <StatusView state="loading" title="正在加载用户主页" />;
  if (error) return <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={loadProfile}>重试</button>} />;
  if (!profile) return <StatusView state="not-found" title="用户不存在" action={<Link className="button primary" to="/">返回首页</Link>} />;

  const isSelf = user?.id === profile.user.id;
  return (
    <section className="page-stack">
      <div className="user-signal-card">
        <span className="module-label"><UserRound size={16} />USER SIGNAL</span>
        <h1>{profile.user.nickname || profile.user.name}</h1>
        <p>@{profile.user.name}</p>
        {profile.user.intro ? <p>{profile.user.intro}</p> : <p className="muted">这个用户还没有填写简介。</p>}
        <div className="signal-stats"><span>关注 {profile.followingCount}</span><span>粉丝 {profile.followerCount}</span></div>
        {isSelf ? <span className="badge">这是你的公开主页</span> : <button className="button primary" type="button" onClick={toggleFollow}><UserPlus size={17} />{profile.viewerFollowing ? '已关注' : '关注'}</button>}
      </div>
      {contents && contents.list.length > 0 ? <div className="content-grid">{contents.list.map((content) => <ContentCard key={content.id} content={content} to={'/contents/' + content.id} />)}<Pagination page={contents.page} pageSize={contents.pageSize} total={contents.total} onChange={setPage} /></div> : <StatusView state="empty" title="暂无公开动态" message="这个用户还没有公开动态。" />}
    </section>
  );
}
