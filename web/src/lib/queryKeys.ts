// by AI.Coding：查询键工厂集中描述缓存层级，保证分页和筛选参数完整进入 key。
export const queryKeys = {
  contents: {
    published: (filters: object) => ['contents', 'published', filters] as const,
    detail: (contentId: number) => ['contents', 'detail', contentId] as const
  },
  tags: {
    enabled: () => ['tags', 'enabled'] as const
  },
  comments: {
    roots: (contentId: number, page: number, pageSize: number) => ['comments', 'roots', contentId, page, pageSize] as const,
    replies: (rootId: number) => ['comments', 'replies', rootId] as const
  },
  notifications: {
    all: () => ['notifications'] as const,
    list: (userId: number, filters: object) => ['notifications', 'list', userId, filters] as const,
    unread: (userId: number) => ['notifications', 'unread', userId] as const
  }
};
