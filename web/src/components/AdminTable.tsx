import type { ReactNode } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Pagination } from './Pagination';
import { StatusView } from './StatusView';

interface AdminTableProps {
  title: string;
  description: string;
  loading: boolean;
  error: string;
  empty: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function AdminTable({ title, description, loading, error, empty, page, pageSize, total, onPageChange, onRetry, toolbar, children }: AdminTableProps) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <span className="admin-kicker">CONTROL SURFACE</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {toolbar ? <div className="admin-toolbar">{toolbar}</div> : null}
      </div>
      {loading ? <StatusView state="loading" title="正在加载管理数据" /> : null}
      {!loading && error ? <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={onRetry}><RefreshCcw size={17} />重试</button>} /> : null}
      {!loading && !error && empty ? <StatusView state="empty" title="暂无数据" message="当前筛选条件下没有记录。" /> : null}
      {!loading && !error && !empty ? (
        <>
          <div className="admin-table-wrap">{children}</div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} />
        </>
      ) : null}
    </section>
  );
}

export function AdminStatusBadge({ value }: { value: string }) {
  return <span className={'admin-status status-' + value}>{value}</span>;
}

export function AdminActions({ children }: { children: ReactNode }) {
  return <div className="admin-actions">{children}</div>;
}
