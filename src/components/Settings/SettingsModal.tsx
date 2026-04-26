import React, { useEffect, useState } from 'react';
import { useKanban } from '../../KanbanContext';
import { useAuth, type AuthUser } from '../../auth/AuthContext';
import { translations } from '../../i18n';
import { selfApi, usersApi, ApiError } from '../../api';
import { X, Moon, Sun, Globe, UserPlus, Download, Upload, AlertTriangle, Trash2, KeyRound, Users, RefreshCw, Shield, LayoutGrid } from 'lucide-react';

interface Props {
  onClose: () => void;
}

type Role = 'Admin' | 'Editor' | 'Viewer';

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const { lang, setLang, theme, setTheme, board, boards, setBoards, assignUserToBoard, removeUserFromBoard, reloadBoards } = useKanban();
  const { user: authUser, mode } = useAuth();
  const t = translations[lang];

  const isAdmin = authUser?.role === 'Admin';
  const isLocal = mode === 'local';

  // ─── Auth users (admin + local only) ────────────────────
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const refreshAuthUsers = async () => {
    if (!isAdmin || !isLocal) return;
    setUsersLoading(true);
    try {
      const list = await usersApi.list();
      setAuthUsers(list);
    } catch (err) {
      console.error('[settings] users load failed:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuthUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLocal]);

  // ─── Add member form (admin + local) ────────────────────
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('Viewer');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // ─── Change password form (any user, local) ─────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const messageStyle = (kind: 'error' | 'success'): React.CSSProperties => ({
    fontSize: '0.82rem',
    fontWeight: 500,
    color: kind === 'error' ? 'var(--error)' : 'var(--color-success)',
  });

  const fieldStyle: React.CSSProperties = {
    background: 'var(--canvas)',
    border: '1px solid var(--hairline)',
    color: 'var(--ink)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--ash)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(null);
    setMemberSuccess(null);
    if (newUserPassword.length < 8) {
      setMemberError(t.passwordTooShort);
      return;
    }
    setMemberSubmitting(true);
    try {
      const created = await usersApi.create({
        username: newUserUsername.trim(),
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        password: newUserPassword,
      });
      // Auto-assign to the active board if there is one.
      if (board) {
        await assignUserToBoard(board.id, { id: created.id, name: created.name, role: created.role });
      }
      await refreshAuthUsers();
      setNewUserUsername('');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('Viewer');
      setNewUserPassword('');
      setMemberSuccess(t.memberAdded);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'username_taken') setMemberError(t.errorUsernameTaken);
      else setMemberError(t.errorGeneric);
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);
    if (newPassword.length < 8) {
      setPwdError(t.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(t.passwordsDontMatch);
      return;
    }
    setPwdSubmitting(true);
    try {
      await selfApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdSuccess(t.passwordChanged);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setPwdError(t.errorInvalidPassword);
      else setPwdError(t.errorGeneric);
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleResetUserPassword = async (user: AuthUser) => {
    const pw = prompt(`${t.newPassword} (${user.name}):`);
    if (!pw) return;
    if (pw.length < 8) { alert(t.passwordTooShort); return; }
    try {
      await usersApi.resetPassword(user.id, pw);
      alert(t.passwordChanged);
    } catch {
      alert(t.errorGeneric);
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!window.confirm(`${t.removeUserConfirm} ${user.name}?`)) return;
    try {
      await usersApi.remove(user.id);
      // Cascade: remove from any board the user was assigned to.
      for (const b of boards) {
        if (b.users.some(u => u.id === user.id)) {
          await removeUserFromBoard(b.id, user.id);
        }
      }
      await refreshAuthUsers();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'last_admin') alert(t.errorLastAdmin);
      else alert(t.errorGeneric);
    }
  };

  const handleAssignToBoard = async (user: AuthUser) => {
    if (!board) return;
    try {
      await assignUserToBoard(board.id, { id: user.id, name: user.name, role: user.role });
    } catch {
      alert(t.errorGeneric);
    }
  };

  const handleRemoveFromBoard = async (userId: string) => {
    if (!board) return;
    if (!window.confirm(t.removeFromBoardConfirm)) return;
    try {
      await removeUserFromBoard(board.id, userId);
    } catch {
      alert(t.errorGeneric);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(boards, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanban-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm(t.restoreWarning)) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          alert('Invalid format. File should be a list of boards.');
          return;
        }
        await setBoards(json);
        await reloadBoards();
        alert('Data restored successfully!');
        onClose();
      } catch {
        alert('Error importing file.');
      }
    };
    reader.readAsText(file);
  };

  const memberIds = new Set((board?.users ?? []).map(u => u.id));
  const usersNotOnBoard = authUsers.filter(u => !memberIds.has(u.id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal glass-panel" onClick={e => e.stopPropagation()} style={{ width: '640px', maxWidth: '95%', borderRadius: '20px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--canvas)', border: '1px solid var(--hairline)', boxShadow: 'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.06) 0 4px 12px 0, rgba(0,0,0,0.16) 0 12px 32px 0' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.8rem' }}>{t.settings}</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Language + Theme */}
        <div className="settings-grid-2">
          <div className="kanban-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={18} color="var(--rausch)" />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.language}</span>
            </div>
            <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es')} style={{ background: 'var(--soft-cloud)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '10px', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div className="kanban-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {theme === 'dark' ? <Moon size={18} color="var(--rausch)" /> : <Sun size={18} color="var(--color-warning)" />}
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.theme}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTheme('light')} style={{ flex: 1, padding: '10px', borderRadius: '10px' }}>{t.light}</button>
              <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTheme('dark')} style={{ flex: 1, padding: '10px', borderRadius: '10px' }}>{t.dark}</button>
            </div>
          </div>
        </div>

        {/* Board Members */}
        <div className="kanban-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <LayoutGrid size={18} color="var(--rausch)" />
              <span style={{ fontWeight: 600 }}>{t.boardMembers}{board ? ` — ${board.name}` : ''}</span>
            </div>
          </div>

          {!board ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--ash)' }}>{t.noBoardSelected}</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: isAdmin ? '16px' : '0' }}>
                {board.users.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--soft-cloud)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid var(--hairline)' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--rausch)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {u.initials}
                    </div>
                    {u.name}
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ash)', background: 'var(--canvas)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--hairline)' }}>{u.role}</span>
                    {isAdmin && board.users.length > 1 && (
                      <button onClick={() => void handleRemoveFromBoard(u.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.6 }} title={t.removeFromBoard}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Admin: assign existing user to this board */}
              {isAdmin && isLocal && usersNotOnBoard.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  <span style={labelStyle}>{t.assignExistingUser}</span>
                  <select
                    onChange={(e) => {
                      const u = authUsers.find(x => x.id === e.target.value);
                      if (u) void handleAssignToBoard(u);
                      e.target.value = '';
                    }}
                    style={fieldStyle}
                  >
                    <option value="">{t.selectUserPlaceholder}</option>
                    {usersNotOnBoard.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add new user (admin + local) */}
        {isAdmin && isLocal && (
          <div className="kanban-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <UserPlus size={18} color="var(--rausch)" />
              <span style={{ fontWeight: 600 }}>{t.addNewUser}</span>
            </div>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="settings-grid-2" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={labelStyle}>{t.username}</span>
                  <input type="text" required minLength={1} maxLength={64} autoComplete="off" value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} style={fieldStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={labelStyle}>{t.addNewMember}</span>
                  <input type="text" required minLength={1} maxLength={128} value={newUserName} onChange={e => setNewUserName(e.target.value)} style={fieldStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={labelStyle}>{t.email}</span>
                <input type="email" required maxLength={256} value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} style={fieldStyle} />
              </div>
              <div className="settings-grid-2" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={labelStyle}>{t.role}</span>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)} style={fieldStyle}>
                    <option value="Viewer">Viewer</option>
                    <option value="Editor">Editor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={labelStyle}>{t.password}</span>
                  <input type="password" required minLength={8} autoComplete="new-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} style={fieldStyle} />
                </div>
              </div>
              {memberError && <div style={messageStyle('error')}>{memberError}</div>}
              {memberSuccess && <div style={messageStyle('success')}>{memberSuccess}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={memberSubmitting} style={{ padding: '10px 20px', borderRadius: '10px', opacity: memberSubmitting ? 0.6 : 1 }}>
                  {t.addMember}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* All users (admin + local) */}
        {isAdmin && isLocal && (
          <div className="kanban-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Users size={18} color="var(--rausch)" />
              <span style={{ fontWeight: 600 }}>{t.allUsers}</span>
              <button onClick={() => void refreshAuthUsers()} className="btn-icon btn-icon-sm" title={t.refresh} style={{ marginLeft: 'auto' }}>
                <RefreshCw size={12} />
              </button>
            </div>
            {usersLoading ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--ash)' }}>…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {authUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--soft-cloud)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--hairline)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--rausch)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 'bold' }}>
                      {u.initials}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--ash)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ash)', background: 'var(--canvas)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--hairline)' }}>{u.role}</span>
                    <button className="btn-icon btn-icon-sm" onClick={() => void handleResetUserPassword(u)} title={t.resetPassword}>
                      <KeyRound size={12} />
                    </button>
                    {u.id !== authUser?.id && (
                      <button className="btn-icon btn-icon-sm" onClick={() => void handleDeleteUser(u)} title={t.removeUser} style={{ color: 'var(--error)' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {authUsers.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--ash)' }}>—</div>}
              </div>
            )}
          </div>
        )}

        {/* Change my password */}
        {isLocal && authUser && (
          <div className="kanban-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <KeyRound size={18} color="var(--rausch)" />
              <span style={{ fontWeight: 600 }}>{t.changePassword}</span>
            </div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={labelStyle}>{t.currentPassword}</span>
                <input type="password" required autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={fieldStyle} />
              </div>
              <div className="settings-grid-2" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={labelStyle}>{t.newPassword}</span>
                  <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={fieldStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={labelStyle}>{t.confirmPassword}</span>
                  <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={fieldStyle} />
                </div>
              </div>
              {pwdError && <div style={messageStyle('error')}>{pwdError}</div>}
              {pwdSuccess && <div style={messageStyle('success')}>{pwdSuccess}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={pwdSubmitting} style={{ padding: '10px 20px', borderRadius: '10px', opacity: pwdSubmitting ? 0.6 : 1 }}>
                  {t.update}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notice for non-admin / non-local */}
        {!isAdmin && (
          <div style={{ fontSize: '0.82rem', color: 'var(--ash)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} />
            {t.adminPanelNote}
          </div>
        )}
        {isAdmin && !isLocal && (
          <div style={{ fontSize: '0.82rem', color: 'var(--ash)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} />
            {t.addMemberLocalOnly}
          </div>
        )}

        {/* Backup & Recovery — admin only (replaces all boards on import) */}
        {isAdmin && (
          <div className="kanban-card" style={{ padding: '24px', border: '1px solid var(--hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Download size={18} color="var(--ash)" />
              <span style={{ fontWeight: 600 }}>{t.backupRestore}</span>
            </div>
            <div className="settings-grid-2">
              <button className="btn btn-ghost" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '14px', border: '1px dashed var(--hairline)' }}>
                <Download size={16} />
                {t.exportData}
              </button>
              <div style={{ position: 'relative' }}>
                <input type="file" accept=".json" onChange={handleImport} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '14px', border: '1px dashed var(--hairline)', color: 'var(--color-danger)' }}>
                  <Upload size={16} />
                  {t.importData}
                </button>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--ash)', opacity: 0.8 }}>
              <AlertTriangle size={14} />
              {t.restoreWarning}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
