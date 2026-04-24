import React, { useState } from 'react';
import { useKanban } from '../../KanbanContext';
import { translations } from '../../i18n';
import { X, Moon, Sun, Globe, UserPlus, Download, Upload, AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const { lang, setLang, theme, setTheme, board, addUser, removeUser, boards, setBoards } = useKanban();
  const t = translations[lang];
  const [newUserName, setNewUserName] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      addUser(newUserName.trim());
      setNewUserName('');
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
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setBoards(json);
          alert('Data restored successfully!');
          onClose();
        } else {
          alert('Invalid format. File should be a list of boards.');
        }
      } catch {
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal glass-panel" onClick={e => e.stopPropagation()} style={{ width: '580px', maxWidth: '95%', borderRadius: '20px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--canvas)', border: '1px solid var(--hairline)', boxShadow: 'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.06) 0 4px 12px 0, rgba(0,0,0,0.16) 0 12px 32px 0' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.8rem' }}>{t.settings}</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Language Toggle */}
            <div className="kanban-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Globe size={18} color="var(--rausch)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.language}</span>
              </div>
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as 'en' | 'es')}
                style={{ background: 'var(--soft-cloud)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '10px', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <div className="kanban-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {theme === 'dark' ? <Moon size={18} color="var(--rausch)" /> : <Sun size={18} color="var(--color-warning)" />}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.theme}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setTheme('light')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                >
                  {t.light}
                </button>
                <button 
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setTheme('dark')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                >
                  {t.dark}
                </button>
              </div>
            </div>
          </div>

          {/* Manage Team */}
          <div className="kanban-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <UserPlus size={18} color="var(--rausch)" />
              <span style={{ fontWeight: 600 }}>{t.manageTeam}</span>
            </div>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--soft-cloud)', padding: '8px', borderRadius: '16px', border: '1px solid var(--hairline)' }}>
              <input 
                type="text" 
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                placeholder={t.addNewMember}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--ink)', padding: '4px 8px', outline: 'none', fontSize: '0.9rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '10px' }}>Add</button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {board.users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--soft-cloud)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid var(--hairline)' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--rausch)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {u.initials}
                  </div>
                  {u.name}
                  {board.users.length > 1 && (
                    <button 
                      onClick={() => {
                        if (window.confirm(`Remove ${u.name} from team?`)) {
                          removeUser(u.id);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Backup & Recovery */}
          <div className="kanban-card" style={{ padding: '24px', border: '1px solid var(--hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Download size={18} color="var(--ash)" />
              <span style={{ fontWeight: 600 }}>{t.backupRestore}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button 
                className="btn btn-ghost" 
                onClick={handleExport}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '14px', border: '1px dashed var(--hairline)' }}
              >
                <Download size={16} />
                {t.exportData}
              </button>

              <div style={{ position: 'relative' }}>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleImport}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
                <button 
                  className="btn btn-ghost" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '14px', border: '1px dashed var(--hairline)', color: 'var(--color-danger)' }}
                >
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
        </div>
      </div>
    </div>
  );
};
