// by AI.Coding：通知 SSE 客户端使用 fetch 携带 Bearer，并实现分块解析和指数退避重连。
import { readStoredSession } from '../auth/session';
import { notifyAuthCleared, resolveApiUrl } from '../lib/request';

export interface NotificationStreamEvent {
  type: string;
  notificationId?: number;
}

interface StreamOptions {
  signal: AbortSignal;
  onEvent: (event: NotificationStreamEvent) => void;
}

// by AI.Coding：解析单个 SSE 帧，注释心跳和无 data 事件会被忽略。
function parseFrame(frame: string) {
  let eventType = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) eventType = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { type: eventType, ...(JSON.parse(dataLines.join('\n')) as object) } as NotificationStreamEvent;
  } catch {
    return null;
  }
}

// by AI.Coding：单次连接读取不完整 chunk，直到 abort 或服务端关闭流。
async function consumeStream(options: StreamOptions) {
  const session = readStoredSession();
  if (!session?.token) return;
  const response = await fetch(resolveApiUrl('/notifications/stream'), { headers: { Authorization: 'Bearer ' + session.token, Accept: 'text/event-stream' }, signal: options.signal });
  if (!response.ok || !response.body) {
    if (response.status === 401 || response.status === 403) notifyAuthCleared('登录状态已失效，请重新登录。', -1004);
    throw new Error('实时通知连接失败');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!options.signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseFrame(frame);
      if (event) options.onEvent(event);
      boundary = buffer.indexOf('\n\n');
    }
  }
}

// by AI.Coding：网络断开后按 1/2/5/10/30 秒重连，Abort 时立即停止。
export async function connectNotificationStream(options: StreamOptions) {
  const delays = [1_000, 2_000, 5_000, 10_000, 30_000];
  let attempt = 0;
  while (!options.signal.aborted) {
    try {
      await consumeStream(options);
      attempt = 0;
    } catch (error) {
      if (options.signal.aborted) return;
      console.warn('实时通知连接中断，准备重连:', error);
    }
    const delay = delays[Math.min(attempt, delays.length - 1)];
    attempt += 1;
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, delay);
      options.signal.addEventListener('abort', () => { window.clearTimeout(timer); resolve(); }, { once: true });
    });
  }
}
