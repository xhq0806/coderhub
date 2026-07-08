import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  if (totalPages <= 1) return null;

  return (
    <div className="pagination" aria-label="分页">
      <button className="button ghost icon-button" type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="上一页" title="上一页">
        <ChevronLeft size={18} />
      </button>
      <span className="page-counter">{page} / {totalPages}</span>
      <button className="button ghost icon-button" type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="下一页" title="下一页">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
