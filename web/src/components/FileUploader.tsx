// by AI.Coding：文件上传组件封装校验、压缩、真实进度、取消和错误展示。
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { FileItem } from '../api/types';
import type { UploadOptions } from '../api/files';
import { getErrorMessage } from '../lib/errors';
import { IMAGE_ACCEPT, prepareImage } from '../lib/imageProcessing';
import { resolveAssetUrl } from '../lib/request';

type UploadPhase = 'idle' | 'validating' | 'compressing' | 'uploading' | 'success' | 'error';

interface FileUploaderProps {
  label: string;
  buttonText: string;
  usage?: 'avatar' | 'content_image';
  upload: (file: File, options?: UploadOptions) => Promise<FileItem>;
  onUploaded: (file: FileItem) => void;
}

// by AI.Coding：上传状态细分为校验、压缩和传输阶段，帮助用户理解耗时来源。
export function FileUploader({ label, buttonText, usage = 'content_image', upload, onUploaded }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [lastFile, setLastFile] = useState<FileItem | null>(null);
  const busy = phase === 'validating' || phase === 'compressing' || phase === 'uploading';

  // by AI.Coding：组件卸载时取消仍在进行的 XHR，避免回调更新已卸载组件。
  useEffect(() => () => abortRef.current?.abort(), []);

  // by AI.Coding：文件选择后先校验和压缩，再进入可观测的 XHR 上传阶段。
  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    setProgress(0);
    try {
      const prepared = await prepareImage(file, usage, setPhase);
      setPhase('uploading');
      const uploaded = await upload(prepared, { signal: controller.signal, onProgress: setProgress });
      setLastFile(uploaded);
      setPhase('success');
      onUploaded(uploaded);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') setError('上传已取消');
      else setError(getErrorMessage(err, '上传失败'));
      setPhase('error');
    } finally {
      abortRef.current = null;
      event.target.value = '';
    }
  }

  // by AI.Coding：状态文案与进度条同步，传输阶段显示真实百分比。
  function phaseText() {
    if (phase === 'validating') return '正在校验图片...';
    if (phase === 'compressing') return '正在压缩图片...';
    if (phase === 'uploading') return `上传中 ${progress}%`;
    return buttonText;
  }

  return (
    <div className="uploader">
      <label>{label}</label>
      <div className="uploader-row">
        <button className="button secondary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}><ImagePlus size={17} />{phaseText()}</button>
        {busy ? <button className="button ghost icon-button" type="button" onClick={() => abortRef.current?.abort()} aria-label="取消上传"><X size={16} /></button> : null}
        {lastFile ? <span className="muted">已上传：#{lastFile.id}</span> : null}
      </div>
      <input ref={inputRef} className="visually-hidden" type="file" accept={IMAGE_ACCEPT} onChange={handleChange} />
      {phase === 'uploading' ? <progress className="upload-progress" max={100} value={progress} aria-label="图片上传进度">{progress}%</progress> : null}
      {lastFile ? <img className="upload-preview" src={resolveAssetUrl(lastFile.url)} alt={lastFile.originalName || '上传图片'} loading="lazy" decoding="async" /> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
