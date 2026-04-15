import { useState } from 'react';
import './App.css';
import { KanbanProvider } from './KanbanContext';
import { BoardArea } from './components/Board/BoardArea';
import { Dashboard } from './components/Analytics/Dashboard';
import { SettingsModal } from './components/Settings/SettingsModal';
import { translations } from './i18n';
import { useKanban } from './KanbanContext';
import { LayoutDashboard, Settings, BarChart3, Plus, Trash2 } from 'lucide-react';

const KanbanApp = () => {
  const { theme, lang, boards, activeBoardId, setActiveBoardId, addBoard, removeBoard, board } = useKanban();
  const t = translations[lang];
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!board) return <div style={{ background: '#0d1117', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Workspace...</div>;

  return (
    <div className={`app-container ${theme === 'light' ? 'light-theme' : ''}`}>
      <nav className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="top-nav-logo">
            <LayoutDashboard size={24} />
            <span>KanbanBoard</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 400, marginLeft: '4px', background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>v1.1</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
            <select 
              value={activeBoardId} 
              onChange={(e) => setActiveBoardId(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontStyle: 'Inter', fontWeight: 600, fontSize: '0.9rem', outline: 'none' }}
            >
              {boards.map(b => (
                <option key={b.id} value={b.id} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>{b.name}</option>
              ))}
            </select>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                const name = prompt('Enter board name:');
                if (name) addBoard(name);
              }}
              style={{ padding: '4px' }}
              title="Add Board"
            >
              <Plus size={16} />
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                if (window.confirm(`Delete board "${board.name}"?`)) removeBoard(activeBoardId);
              }}
              style={{ padding: '4px' }}
              title="Delete Board"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
            <Settings size={18} /> {t.settings}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowDashboard(true)}>
            <BarChart3 size={18} /> {t.analytics}
          </button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem' }}>
            AS
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
    <KanbanProvider>
      <KanbanApp />
    </KanbanProvider>
  );
}

export default App;
