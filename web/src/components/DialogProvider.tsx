// by AI.Coding：全局确认 Dialog 负责队列、键盘关闭、焦点恢复和危险操作防重复。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { subscribeConfirmRequests, type ConfirmRequest } from '../lib/feedback';

// by AI.Coding：Provider 在应用根部挂载，业务页面只依赖 confirmDanger Promise。
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const settlingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeRequest = queue[0] ?? null;

  // by AI.Coding：订阅全局确认请求并以 FIFO 顺序入队，避免并发操作互相覆盖。
  useEffect(() => subscribeConfirmRequests((request) => {
    setQueue((current) => [...current, request]);
  }), []);

  // by AI.Coding：Dialog 打开时默认聚焦取消按钮，关闭后恢复触发元素焦点。
  useEffect(() => {
    if (!activeRequest) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => cancelRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [activeRequest?.id]);

  // by AI.Coding：确认结果只解析一次，然后切换到队列中的下一项。
  function settle(confirmed: boolean) {
    if (!activeRequest || settlingRef.current) return;
    settlingRef.current = true;
    activeRequest.resolve(confirmed);
    setQueue((current) => current.slice(1));
  }

  // by AI.Coding：新请求成为活动项后解除同步锁，确保快速双击不能影响下一项。
  useEffect(() => {
    settlingRef.current = false;
  }, [activeRequest?.id]);

  // by AI.Coding：Escape 始终按取消处理，降低键盘误确认危险操作的概率。
  useEffect(() => {
    if (!activeRequest) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeRequest?.id]);

  return (
    <>
      {children}
      {activeRequest ? (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          // by AI.Coding：只有直接点击遮罩时取消，点击弹窗内容不会冒泡关闭。
          if (event.target === event.currentTarget) settle(false);
        }}>
          <section
            className="dialog-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`dialog-title-${activeRequest.id}`}
            aria-describedby={`dialog-description-${activeRequest.id}`}
          >
            <span className="dialog-icon" aria-hidden="true"><AlertTriangle size={24} /></span>
            <div className="dialog-copy">
              <h2 id={`dialog-title-${activeRequest.id}`}>{activeRequest.title || '请确认操作'}</h2>
              <p id={`dialog-description-${activeRequest.id}`}>{activeRequest.message}</p>
            </div>
            <div className="dialog-actions">
              <button ref={cancelRef} className="button ghost" type="button" onClick={() => settle(false)}>
                {activeRequest.cancelText || '取消'}
              </button>
              <button className="button danger" type="button" onClick={() => settle(true)}>
                {activeRequest.confirmText || '确认'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
