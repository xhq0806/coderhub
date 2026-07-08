import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import type { FileItem } from '../api/types';
import { ApiError, resolveAssetUrl } from '../lib/request';

interface FileUploaderProps {
  label: string;
  buttonText: string;
  upload: (file: File) => Promise<FileItem>;
  onUploaded: (file: FileItem) => void;
}

export function FileUploader({ label, buttonText, upload, onUploaded }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastFile, setLastFile] = useState<FileItem | null>(null);

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
