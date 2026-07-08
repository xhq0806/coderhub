import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { registerUser } from '../api/user';
import { getErrorMessage } from '../lib/errors';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await registerUser({ name: name.trim(), password });
      navigate('/login', { state: { notice: '注册成功，请登录' } });
    } catch (err) {
      setError(getErrorMessage(err, '注册失败'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-poster">
        <span className="module-label"><UserPlus size={16} />JOIN</span>
        <h1>创建账号</h1>
        <p>注册后即可进入用户端发布和评论闭环。</p>
      </aside>
      <form className="auth-panel form-grid" onSubmit={handleSubmit}>
        <div>
          <h1>注册</h1>
          <p className="muted">创建普通用户账号</p>
        </div>
        <label className="form-field">
          <span>用户名</span>
          <input className="input" value={name} autoComplete="username" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="form-field">
          <span>密码</span>
          <input className="input" type="password" value={password} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={submitting}><UserPlus size={17} />{submitting ? '注册中...' : '注册'}</button>
          <Link className="button ghost" to="/login"><LogIn size={17} />去登录</Link>
        </div>
      </form>
    </div>
  );
}
