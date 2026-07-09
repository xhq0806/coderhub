// 文件上传组件，封装上传按钮、进度状态和错误展示。
import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import type { FileItem } from '../api/types';
import { ApiError, resolveAssetUrl } from '../lib/request';

// 上传组件入参由调用方提供具体上传函数和上传成功回调。
interface FileUploaderProps {
  label: string;
  buttonText: string;
  upload: (file: File) => Promise<FileItem>;
  onUploaded: (file: FileItem) => void;
}

// 文件上传组件隐藏原生输入细节，统一展示上传状态和错误。
export function FileUploader({ label, buttonText, upload, onUploaded }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastFile, setLastFile] = useState<FileItem | null>(null);

  // 选择文件后立即上传，上传完成后清空 input 以支持重复选择同一文件。
  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await upload(file);
      setLastFile(uploaded);
      onUploaded(uploaded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '上传失败');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="uploader">
      <label>{label}</label>
      <div className="uploader-row">
        <button className="button secondary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={17} />{uploading ? '上传中...' : buttonText}
        </button>
        {lastFile ? <span className="muted">已上传：#{lastFile.id}</span> : null}
      </div>
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleChange} />
      {lastFile ? <img className="upload-preview" src={resolveAssetUrl(lastFile.url)} alt={lastFile.originalName || '上传图片'} /> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
