// 个人资料页，负责昵称、简介和头像维护。
import { useEffect, useState, type FormEvent } from 'react';
import { Save, UserRound } from 'lucide-react';
import { updateCurrentUser } from '../api/user';
import { uploadAvatar } from '../api/files';
import { useAuth } from '../auth/useAuth';
import { FileUploader } from '../components/FileUploader';
import { getErrorMessage } from '../lib/errors';
import { resolveAssetUrl } from '../lib/request';
import { validateProfileForm } from '../lib/validation';

// 资料页用本地表单状态承接当前用户资料，并在保存后同步认证上下文。
export function ProfilePage() {
  const { session, user, updateUser } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || user?.name || '');
  const [intro, setIntro] = useState(user?.intro || '');
  const [avatarFileId, setAvatarFileId] = useState<number | null>(user?.avatarFileId || null);
  const [avatarPreview, setAvatarPreview] = useState(session?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setNickname(user.nickname || user.name);
    setIntro(user.intro || '');
    setAvatarFileId(user.avatarFileId || null);
    setAvatarPreview(session?.avatarUrl || '');
  }, [user, session?.avatarUrl]);

  // 保存资料时只提交用户可编辑字段，成功后刷新全局用户信息。
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateProfileForm(nickname, intro);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        nickname: nickname.trim(),
        intro: intro.trim(),
        ...(avatarFileId ? { avatarFileId } : {})
      };
      const updated = await updateCurrentUser(payload);
      updateUser(updated, avatarPreview || session?.avatarUrl);
      setNotice('资料已保存。');
    } catch (err) {
      setError(getErrorMessage(err, '保存资料失败'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-grid">
      <aside className="side-note profile-note">
        <span className="module-label"><UserRound size={16} />PROFILE</span>
        <h1>个人资料</h1>
        <p>用于动态详情、评论和内容管理中的身份展示。</p>
        <div className="profile-token">{nickname.slice(0, 2) || 'CH'}</div>
      </aside>
      <form className="form-panel form-grid" onSubmit={handleSubmit}>
        <div className="page-header compact-header">
        <div>
          <h1>资料维护</h1>
          <p className="muted">维护昵称、头像和简介</p>
        </div>
      </div>
        <div className="form-field">
          <span>头像</span>
          {avatarPreview ? <img className="avatar-preview" src={resolveAssetUrl(avatarPreview)} alt="当前头像" loading="lazy" decoding="async" /> : <span className="muted">当前头像文件：{avatarFileId ? '#' + avatarFileId : '未设置'}</span>}
        </div>
        <FileUploader
          label="上传头像"
          buttonText="选择头像"
          usage="avatar"
          upload={uploadAvatar}
          onUploaded={(file) => {
            setAvatarFileId(file.id);
            setAvatarPreview(file.url);
          }}
        />
        <label className="form-field">
          <span>昵称</span>
          <input className="input" value={nickname} maxLength={30} onChange={(event) => setNickname(event.target.value)} />
        </label>
        <label className="form-field">
          <span>简介</span>
          <textarea className="textarea" value={intro} maxLength={200} onChange={(event) => setIntro(event.target.value)} />
        </label>
        {notice ? <p className="success-text">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={saving}><Save size={17} />{saving ? '保存中...' : '保存资料'}</button>
        </div>
      </form>
    </section>
  );
}
