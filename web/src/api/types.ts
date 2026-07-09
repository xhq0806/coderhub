// 前端接口类型定义，集中描述后端统一响应中的业务实体。
export type ApiCode = 0 | -1001 | -1002 | -1003 | -1004 | -1005 | -1006 | -1007 | -1008 | -1009 | -1010 | -1500;

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type UserStatus = 'active' | 'disabled';
export type ContentStatus = 'pending' | 'published' | 'rejected' | 'offline' | 'deleted';
export type TagStatus = 'enabled' | 'disabled';
export type FileUsageType = 'avatar' | 'content_image';

export interface UserProfile {
  id: number;
  name: string;
  nickname: string | null;
  avatarFileId: number | null;
  intro: string | null;
  role: 'user' | 'admin' | string;
  status: UserStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  avatarUrl?: string;
}

export interface RegisterPayload {
  name: string;
  password: string;
}

export interface LoginPayload {
  name: string;
  password: string;
}

export interface UpdateProfilePayload {
  nickname?: string;
  avatarFileId?: number | null;
  intro?: string;
}

export interface TagItem {
  id: number;
  name: string;
  status: TagStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileItem {
  id: number;
  userId: number;
  usageType: FileUsageType | string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  status: 'active' | 'deleted' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentItem {
  id: number;
  userId: number;
  body: string | null;
  status: ContentStatus;
  rejectReason: string | null;
  reviewerId: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerFavorited: boolean;
}

export interface ContentDetail extends ContentItem {
  tags: TagItem[];
  files: Pick<FileItem, 'id' | 'url' | 'usageType' | 'status'>[];
}

export interface ContentPayload {
  body?: string;
  tagIds?: number[];
  fileIds?: number[];
}

export interface ListContentParams {
  page?: number;
  pageSize?: number;
  tagId?: number;
  status?: ContentStatus;
  keyword?: string;
  sort?: 'latest' | 'hot';
}

export interface ContentInteractionState {
  contentId: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerFavorited: boolean;
}

export interface UserPublicProfile {
  user: UserProfile;
  followerCount: number;
  followingCount: number;
  viewerFollowing: boolean;
}

export type NotificationStatus = 'unread' | 'read';
export type NotificationType = 'content_approved' | 'content_rejected' | 'comment' | 'reply' | 'like' | 'favorite' | 'follow';
export type NotificationTargetType = 'content' | 'comment' | 'user';

export interface NotificationItem {
  id: number;
  userId: number;
  actorUserId: number | null;
  type: NotificationType | string;
  title: string;
  body: string | null;
  targetType: NotificationTargetType | string;
  targetId: number;
  status: NotificationStatus | string;
  createdAt: string;
  readAt: string | null;
}

export interface CommentItem {
  id: number;
  contentId: number;
  userId: number;
  parentId: number | null;
  body: string;
  status: 'visible' | 'deleted' | string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentPayload {
  body: string;
}
