// by AI.Coding：反馈适配层通过订阅机制把业务确认请求交给全局 Dialog 渲染。
export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  message: string;
  resolve: (confirmed: boolean) => void;
}

type ConfirmListener = (request: ConfirmRequest) => void;

let nextRequestId = 1;
let listener: ConfirmListener | null = null;
const pendingRequests: ConfirmRequest[] = [];

// by AI.Coding：Provider 注册监听器后按顺序消费此前积压的确认请求。
export function subscribeConfirmRequests(nextListener: ConfirmListener) {
  listener = nextListener;
  while (pendingRequests.length > 0) {
    const request = pendingRequests.shift();
    if (request) nextListener(request);
  }

  // by AI.Coding：仅允许当前监听器注销，避免 StrictMode 清理旧订阅时误伤新订阅。
  return () => {
    if (listener === nextListener) listener = null;
  };
}

// by AI.Coding：危险操作统一异步确认；Dialog 未挂载时请求排队而不是回退原生确认框。
export function confirmDanger(message: string, options: ConfirmOptions = {}) {
  return new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = { id: nextRequestId++, message, resolve, ...options };
    if (listener) listener(request);
    else pendingRequests.push(request);
  });
}
