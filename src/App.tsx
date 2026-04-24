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
  const { theme, lang, boards, activeBoardId, setActiveBoardId, addBoard, removeBoard, board } = useKanban();
  const { user, logout } = useAuth();
  const t = translations[lang];
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!board) return (
    <div style={{ background: '#f7f7f7', color: '#222222', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
      Loading Workspace...
    </div>
  );

  return (
    <div className={`app-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <nav className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="top-nav-logo">
            <LayoutDashboard size={22} />
            <span>KanbanBoard</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--hairline)', paddingLeft: '24px' }}>
            <select
              value={activeBoardId}
              onChange={(e) => setActiveBoardId(e.target.value)}
              style={{ background: 'transparent', color: 'var(--ink)', border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              {boards.map(b => (
                <option key={b.id} value={b.id} style={{ background: 'var(--canvas)', color: 'var(--ink)' }}>{b.name}</option>
              ))}
            </select>
            <button
              className="btn-icon"
              onClick={() => { const name = prompt('Enter board name:'); if (name) addBoard(name); }}
              title="Add Board"
            >
              <Plus size={14} />
            </button>
            <button
              className="btn-icon"
              onClick={() => { if (window.confirm(`Delete board "${board.name}"?`)) removeBoard(activeBoardId); }}
              title="Delete Board"
              style={{ color: 'var(--error)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> {t.settings}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowDashboard(true)}>
            <BarChart3 size={16} /> {t.analytics}
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
        <BoardArea />
      </div>

      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
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
