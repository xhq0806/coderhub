// pages/FavoritesPage.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listFavoriteContents, unfavoriteContent } from '../api/interactions';
import type { ContentItem, PageResult } from '../api/types';
import { ContentCard } from '../components/ContentCard';
import { Pagination } from '../components/Pagination';
import { StatusView } from '../components/StatusView';
import { getErrorMessage } from '../lib/errors';

const pageSize = 10;

// 我的收藏页展示当前用户剪藏的公开动态，并支持取消收藏后刷新列表。
export function FavoritesPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<ContentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 收藏列表只读取仍公开的内容，失效内容由后端过滤。
  async function loadFavorites() {
    setLoading(true);
    setError('');
    try {
      setResult(await listFavoriteContents({ page, pageSize }));
    } catch (err) {
      setError(getErrorMessage(err, '收藏列表加载失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, [page]);

  // 取消收藏后刷新当前页，让剪藏夹保持最新状态。
  async function removeFavorite(id: number) {
    try {
      await unfavoriteContent(id);
      await loadFavorites();
    } catch (err) {
      setError(getErrorMessage(err, '取消收藏失败'));
    }
  }

  return (
    <section className="page-stack">
      <div className="home-hero signal-hero"><div><span className="module-label">CLIPPED RECORDS</span><h1>我的收藏</h1><p>你收藏过的公开动态会留在这里。</p></div></div>
      {loading ? <StatusView state="loading" title="正在加载收藏" /> : null}
      {!loading && error ? <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={loadFavorites}>重试</button>} /> : null}
      {!loading && !error && result?.list.length === 0 ? <StatusView state="empty" title="还没有收藏任何动态" message="看到值得留存的内容时，点击收藏即可加入这里。" action={<Link className="button primary" to="/">去发现内容</Link>} /> : null}
      {!loading && !error && result && result.list.length > 0 ? <div className="content-grid">{result.list.map((content) => <ContentCard key={content.id} content={content} to={'/contents/' + content.id} actions={<button className="button ghost" type="button" onClick={(event) => { event.preventDefault(); removeFavorite(content.id); }}>移出收藏</button>} />)}<Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} /></div> : null}
    </section>
  );
}
