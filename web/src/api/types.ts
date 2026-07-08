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
