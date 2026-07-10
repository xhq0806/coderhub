// by AI.Coding：首页使用 React Query 缓存公开动态和标签，URL 仍作为筛选状态真源。
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layers3, PenSquare, RadioTower } from 'lucide-react';
import { listPublishedContents } from '../api/contents';
import { listTags } from '../api/tags';
import { ContentCard } from '../components/ContentCard';
import { Pagination } from '../components/Pagination';
import { StatusView } from '../components/StatusView';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../lib/errors';
import { queryKeys } from '../lib/queryKeys';

const pageSize = 10;

// by AI.Coding：首页将可分享筛选条件组成稳定 query key，分页切换时保留上一页数据。
export function HomePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const tagId = Number(searchParams.get('tagId')) || undefined;
  const keyword = searchParams.get('keyword') || '';
  const sort = (searchParams.get('sort') === 'hot' ? 'hot' : 'latest') as 'latest' | 'hot';
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [validationError, setValidationError] = useState('');
  const filters = { page, pageSize, tagId, keyword, sort };
  const contentsQuery = useQuery({
    queryKey: queryKeys.contents.published(filters),
    queryFn: () => listPublishedContents(filters),
    placeholderData: keepPreviousData
  });
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.enabled(),
    queryFn: () => listTags({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000
  });
  const contents = contentsQuery.data ?? null;
  const tags = tagsQuery.data?.list ?? [];
  const error = validationError || (contentsQuery.error ? getErrorMessage(contentsQuery.error, '动态加载失败') : '');

  // by AI.Coding：标签筛选只更新 URL，React Query 根据新 key 自动加载数据。
  function updateFilter(nextTagId?: number) {
    const next = new URLSearchParams(searchParams);
    if (nextTagId) next.set('tagId', String(nextTagId));
    else next.delete('tagId');
    next.set('page', '1');
    setSearchParams(next);
  }

  // by AI.Coding：搜索表单先校验关键词，再把条件同步到 URL。
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = keywordInput.trim();
    if (value.length > 50) {
      setValidationError('关键词不能超过 50 字');
      return;
    }
    setValidationError('');
    const next = new URLSearchParams(searchParams);
    if (value) next.set('keyword', value);
    else next.delete('keyword');
    next.set('page', '1');
    setSearchParams(next);
  }

  // by AI.Coding：排序切换保留其它筛选条件并回到第一页。
  function updateSort(nextSort: 'latest' | 'hot') {
    const next = new URLSearchParams(searchParams);
    next.set('sort', nextSort);
    next.set('page', '1');
    setSearchParams(next);
  }

  // by AI.Coding：分页状态写回 URL，支持刷新和分享当前页面。
  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  return (
    <section className="page-stack">
      <div className="home-hero">
        <div><span className="module-label"><RadioTower size={16} />PUBLIC FEED</span><h1>公开动态</h1><p>按标签巡检已公开的生活记录，快速进入详情和评论现场。</p></div>
        <div className="hero-rail" aria-label="动态概览"><div><strong>{contents?.total ?? '--'}</strong><span>公开记录</span></div><div><strong>{tags.length}</strong><span>启用标签</span></div></div>
        <Link className="button primary hero-action" to={user ? '/publish' : '/login'}><PenSquare size={18} />发布动态</Link>
      </div>
      <div className="filter-panel signal-console" aria-label="搜索和筛选">
        <form className="search-form" onSubmit={submitSearch}><input className="input" value={keywordInput} maxLength={60} placeholder="搜索动态正文" onChange={(event) => setKeywordInput(event.target.value)} /><button className="button primary" type="submit">搜索</button></form>
        <span><Layers3 size={17} />标签筛选</span>
        <button className={'tag-button' + (!tagId ? ' active' : '')} type="button" onClick={() => updateFilter(undefined)}>全部</button>
        {tags.map((tag) => <button key={tag.id} className={'tag-button' + (tagId === tag.id ? ' active' : '')} type="button" onClick={() => updateFilter(tag.id)}>{tag.name}</button>)}
        <button className={'tag-button' + (sort === 'latest' ? ' active' : '')} type="button" onClick={() => updateSort('latest')}>最新</button>
        <button className={'tag-button' + (sort === 'hot' ? ' active' : '')} type="button" onClick={() => updateSort('hot')}>最热</button>
      </div>
      {contentsQuery.isPending ? <StatusView state="loading" title="正在加载动态" /> : null}
      {!contentsQuery.isPending && error ? <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={() => contentsQuery.refetch()}>重试</button>} /> : null}
      {!contentsQuery.isPending && !error && contents?.list.length === 0 ? <StatusView state="empty" title="没有捕捉到匹配信号" message={keyword || tagId ? '换个关键词或标签试试。' : '还没有公开动态。'} /> : null}
      {!contentsQuery.isPending && !error && contents && contents.list.length > 0 ? <div className="content-grid">{contents.list.map((content) => <ContentCard key={content.id} content={content} to={'/contents/' + content.id} />)}<Pagination page={contents.page} pageSize={contents.pageSize} total={contents.total} onChange={updatePage} /></div> : null}
    </section>
  );
}
