import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle, SearchX } from 'lucide-react';

type StatusState = 'loading' | 'empty' | 'error' | 'not-found' | 'success';

interface StatusViewProps {
  state: StatusState;
  title: string;
  message?: string;
  action?: ReactNode;
}

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
