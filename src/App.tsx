import { useState } from 'react';
import './App.css';
import { KanbanProvider } from './KanbanContext';
import { BoardArea } from './components/Board/BoardArea';
import { Dashboard } from './components/Analytics/Dashboard';
import { SettingsModal } from './components/Settings/SettingsModal';
import { translations } from './i18n';
import { useKanban } from './KanbanContext';
import { LayoutDashboard, Settings, BarChart3, Plus, Trash2, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginGate } from './auth/LoginGate';

const KanbanApp = () => {
  const {
    theme, lang, boards, activeBoardId, setActiveBoardId,
    addBoard, removeBoard, board, loading, loadError, isAdmin,
  } = useKanban();
  const { user, logout } = useAuth();
  const t = translations[lang];
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleAddBoard = async () => {
    const name = prompt('Enter board name:');
    if (!name) return;
    try {
      await addBoard(name);
    } catch {
      alert('Failed to create board.');
    }
  };

  const handleRemoveBoard = async () => {
    if (!board) return;
    if (!window.confirm(`Delete board "${board.name}"?`)) return;
    try {
      await removeBoard(activeBoardId);
    } catch {
      alert('Failed to delete board.');
    }
  };

  return (
    <div className={`app-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <nav className="top-nav">
        <div className="top-nav-left">
          <div className="top-nav-logo">
            <LayoutDashboard size={22} />
            <span>KanbanBoard</span>
          </div>

          <div className="top-nav-boards">
            <select
              value={activeBoardId}
              onChange={(e) => setActiveBoardId(e.target.value)}
              disabled={boards.length === 0}
              style={{ background: 'transparent', color: 'var(--ink)', border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              {boards.length === 0 && <option value="">— no boards —</option>}
              {boards.map(b => (
                <option key={b.id} value={b.id} style={{ background: 'var(--canvas)', color: 'var(--ink)' }}>{b.name}</option>
              ))}
            </select>
            {isAdmin && (
              <>
                <button className="btn-icon" onClick={handleAddBoard} title="Add Board">
                  <Plus size={14} />
                </button>
                {board && (
                  <button
                    className="btn-icon"
                    onClick={handleRemoveBoard}
                    title="Delete Board"
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="top-nav-right">
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)} title={t.settings}>
            <Settings size={16} /> <span className="btn-label">{t.settings}</span>
          </button>
          <button className="btn btn-ghost" onClick={() => setShowDashboard(true)} title={t.analytics}>
            <BarChart3 size={16} /> <span className="btn-label">{t.analytics}</span>
          </button>
          <button
            className="btn-icon"
            onClick={() => { void logout(); }}
            title={user ? `Sign out ${user.name}` : 'Sign out'}
            style={{ marginLeft: '4px' }}
          >
            <LogOut size={14} />
          </button>
          <div
            title={user ? `${user.name} (${user.role})` : undefined}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--rausch)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', marginLeft: '4px' }}
          >
            {user?.initials ?? '?'}
          </div>
        </div>
      </nav>

      <div className="main-content">
        {loading ? (
          <div style={centeredStyle}>{t.loadingWorkspace}</div>
        ) : loadError ? (
          <div style={{ ...centeredStyle, color: 'var(--error)' }}>{loadError}</div>
        ) : !board && boards.length === 0 ? (
          <div style={{ ...centeredStyle, flexDirection: 'column', gap: '12px' }}>
            <span style={{ color: 'var(--ash)' }}>{t.noBoardsYet}</span>
            {isAdmin ? (
              <button className="btn btn-primary" onClick={handleAddBoard} style={{ padding: '10px 18px', borderRadius: '10px' }}>
                <Plus size={16} /> {t.createFirstBoard}
              </button>
            ) : (
              <span style={{ color: 'var(--ash)', fontSize: '0.85rem' }}>{t.askAdminForAccess}</span>
            )}
          </div>
        ) : !board ? (
          <div style={centeredStyle}>{t.loadingWorkspace}</div>
        ) : (
          <BoardArea />
        )}
      </div>

      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const centeredStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 500,
  color: 'var(--ash)',
};

function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <KanbanProvider>
          <KanbanApp />
        </KanbanProvider>
      </LoginGate>
    </AuthProvider>
  );
}

export default App;
