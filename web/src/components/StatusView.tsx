// 状态视图组件，统一展示加载、空状态、错误和未找到提示。
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle, SearchX } from 'lucide-react';

type StatusState = 'loading' | 'empty' | 'error' | 'not-found' | 'success';

// 状态视图入参描述当前页面状态、提示文案和可选操作按钮。
interface StatusViewProps {
  state: StatusState;
  title: string;
  message?: string;
  action?: ReactNode;
}

// 状态视图统一选择图标和文案结构，减少页面重复空态代码。
export function StatusView({ state, title, message, action }: StatusViewProps) {
  const icon = {
    loading: <LoaderCircle size={30} className="spin-icon" />,
    empty: <Inbox size={32} />,
    error: <AlertTriangle size={32} />,
    'not-found': <SearchX size={32} />,
    success: <CheckCircle2 size={32} />
  }[state];

  return (
    <section className={'status-view ' + state}>
      <div className="status-icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {action ? <div className="status-action">{action}</div> : null}
    </section>
  );
}
