// 格式化工具，集中处理日期、内容状态和文件大小展示文案。
import type { ContentStatus } from '../api/types';

const labels: Record<ContentStatus, string> = {
  pending: '待审核',
  published: '已公开',
  rejected: '已驳回',
  offline: '已下架',
  deleted: '已删除'
};

export function statusLabel(status: ContentStatus) {
  return labels[status] || status;
}

export function formatDate(value?: string | null) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
