// components/AdminTable.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import type { ReactNode } from 'react';
import { RefreshCcw, ShieldAlert } from 'lucide-react';
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
  forbidden?: boolean;
  toolbar?: ReactNode;
  children: ReactNode;
}

// 管理端表格统一承载列表状态，并为后台接口无权限错误提供专门展示。
export function AdminTable({ title, description, loading, error, empty, page, pageSize, total, onPageChange, onRetry, forbidden = false, toolbar, children }: AdminTableProps) {
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
      {!loading && forbidden ? <StatusView state="error" title="无权限访问管理端数据" message={error || '当前账号没有执行该后台操作的权限。'} action={<a className="button ghost" href="/"><ShieldAlert size={17} />返回用户端</a>} /> : null}
      {!loading && !forbidden && error ? <StatusView state="error" title="加载失败" message={error} action={<button className="button primary" type="button" onClick={onRetry}><RefreshCcw size={17} />重试</button>} /> : null}
      {!loading && !forbidden && !error && empty ? <StatusView state="empty" title="暂无数据" message="当前筛选条件下没有记录。" /> : null}
      {!loading && !forbidden && !error && !empty ? (
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
