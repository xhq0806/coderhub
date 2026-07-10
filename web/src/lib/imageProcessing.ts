// by AI.Coding：图片预处理统一前端类型、大小校验和非 GIF 压缩策略。
import imageCompression from 'browser-image-compression';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const UPLOAD_MAX_SIZE = Number(import.meta.env.VITE_UPLOAD_MAX_SIZE) || 2 * 1024 * 1024;
const allowedTypes = new Set(IMAGE_ACCEPT.split(','));

// by AI.Coding：头像与内容图使用不同最大边长，GIF 跳过压缩以保留动画。
export async function prepareImage(file: File, usage: 'avatar' | 'content_image', onPhase?: (phase: 'validating' | 'compressing') => void) {
  onPhase?.('validating');
  if (!allowedTypes.has(file.type)) throw new Error('仅支持 JPEG、PNG、GIF 或 WebP 图片');
  if (file.type === 'image/gif') {
    if (file.size > UPLOAD_MAX_SIZE) throw new Error('GIF 图片不能超过 2 MB');
    return file;
  }
  if (file.size <= UPLOAD_MAX_SIZE && file.size < 1.5 * 1024 * 1024) return file;
  onPhase?.('compressing');
  const compressed = await imageCompression(file, { maxSizeMB: 1.8, maxWidthOrHeight: usage === 'avatar' ? 1024 : 1920, useWebWorker: true, fileType: file.type });
  const result = compressed instanceof File ? compressed : new File([compressed], file.name, { type: file.type, lastModified: file.lastModified });
  if (result.size > UPLOAD_MAX_SIZE) throw new Error('图片压缩后仍超过 2 MB，请选择更小的图片');
  return result;
}
