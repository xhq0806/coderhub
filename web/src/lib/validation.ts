// 表单校验工具集中维护用户端基础输入规则，避免页面间校验口径分叉。
export const VALIDATION_LIMITS = {
  usernameMin: 2,
  usernameMax: 20,
  passwordMin: 6,
  contentBodyMax: 1000,
  commentBodyMax: 500,
  nicknameMax: 30,
  introMax: 200,
  tagMax: 5,
  imageMax: 9
};

export function validateUsername(name: string) {
  const value = name.trim();
  if (!value) return '用户名不能为空';
  if (value.length < VALIDATION_LIMITS.usernameMin) return '用户名至少 2 个字符';
  if (value.length > VALIDATION_LIMITS.usernameMax) return '用户名不能超过 20 个字符';
  return '';
}

export function validatePassword(password: string) {
  if (!password) return '密码不能为空';
  if (password.length < VALIDATION_LIMITS.passwordMin) return '密码至少 6 个字符';
  return '';
}

export function validateAuthForm(name: string, password: string) {
  return validateUsername(name) || validatePassword(password);
}

export function validateContentDraft(body: string, fileCount: number, tagCount = 0) {
  const value = body.trim();
  if (!value && fileCount === 0) return '正文和图片至少填写一项';
  if (value.length > VALIDATION_LIMITS.contentBodyMax) return '正文不能超过 1000 字';
  if (tagCount > VALIDATION_LIMITS.tagMax) return '标签最多选择 5 个';
  if (fileCount > VALIDATION_LIMITS.imageMax) return '图片最多上传 9 张';
  return '';
}

export function validateCommentBody(body: string) {
  const value = body.trim();
  if (!value) return '评论内容不能为空';
  if (value.length > VALIDATION_LIMITS.commentBodyMax) return '评论内容不能超过 500 字';
  return '';
}

export function validateProfileForm(nickname: string, intro: string) {
  const nextNickname = nickname.trim();
  const nextIntro = intro.trim();
  if (!nextNickname) return '昵称不能为空';
  if (nextNickname.length > VALIDATION_LIMITS.nicknameMax) return '昵称不能超过 30 字';
  if (nextIntro.length > VALIDATION_LIMITS.introMax) return '简介不能超过 200 字';
  return '';
}
