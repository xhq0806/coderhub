import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { consumeAuthNotice } from '../auth/session';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage, isDisabledAccountError } from '../lib/errors';

interface LocationState {
  from?: string;
  notice?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const state = location.state as LocationState | null;
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authNotice] = useState(() => consumeAuthNotice());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login({ name: name.trim(), password });
      navigate(state?.from || '/my/contents', { replace: true });
    } catch (err) {
      // by AI.Coding：账号禁用必须给出稳定提示，不依赖后端文案是否变化。
      setError(isDisabledAccountError(err) ? '账号已被禁用，请联系管理员处理。' : getErrorMessage(err, '登录失败'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-poster">
        <span className="module-label"><LogIn size={16} />ACCESS</span>
        <h1>回到工作台</h1>
        <p>继续发布动态、处理评论和维护个人资料。</p>
      </aside>
      <form className="auth-panel form-grid" onSubmit={handleSubmit}>
        <div>
          <h1>登录</h1>
          <p className="muted">进入你的 coderhub 账号</p>
        </div>
        {state?.notice ? <p className="success-text">{state.notice}</p> : null}
        {authNotice ? <p className="form-error">{authNotice}</p> : null}
        <label className="form-field">
          <span>用户名</span>
          <input className="input" value={name} autoComplete="username" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="form-field">
          <span>密码</span>
          <input className="input" type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={submitting}><LogIn size={17} />{submitting ? '登录中...' : '登录'}</button>
          <Link className="button ghost" to="/register"><UserPlus size={17} />注册账号</Link>
        </div>
      </form>
    </div>
  );
}
