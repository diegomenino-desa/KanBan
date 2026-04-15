import React, { useState } from 'react';
import { useKanban } from '../../KanbanContext';
import type { CardType } from '../../types';
import { X, Calendar, Flag, Users } from 'lucide-react';

interface Props {
  columnId: string;
  onClose: () => void;
}

export const NewCardModal: React.FC<Props> = ({ columnId, onClose }) => {
  const { addCard, board } = useKanban();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CardType>('Feature');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');

  const cardTypes: CardType[] = ['Feature', 'Bug', 'Expedite', 'TechDebt', 'Spike'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    addCard({
      title: title.trim(),
      description: description.trim(),
      type,
      columnId,
      assignees: selectedAssignees,
      dueDate: dueDate || undefined,
    });
    onClose();
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-panel modal-content-anim" onClick={e => e.stopPropagation()} style={{ 
        width: '720px', 
        maxWidth: '95%', 
        borderRadius: '24px', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        background: 'var(--bg-board)',
        border: '1px solid var(--border-color)'
      }}>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <input 
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Card Title"
                style={{ 
                  width: '100%', 
                  fontSize: '1.8rem', 
                  fontWeight: 700, 
                  border: 'none', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  outline: 'none',
                  padding: '0'
                }}
                required
              />
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '8px', marginTop: '-8px', marginRight: '-12px' }}>
                <X size={20} />
              </button>
            </div>
            
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add detailed description..."
              rows={4}
              style={{ 
                width: '100%', 
                fontSize: '1rem', 
                border: 'none', 
                background: 'transparent', 
                color: 'var(--text-secondary)', 
                outline: 'none', 
                resize: 'none', 
                lineHeight: 1.6,
                padding: '0'
              }}
            />
          </div>

          {/* Properties Section */}
          <div style={{ 
            padding: '24px 40px', 
            borderTop: '1px solid var(--border-color)', 
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Flag size={14} /> CATEGORY
                </div>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value as CardType)}
                  style={{ 
                    background: 'var(--bg-app)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)', 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {cardTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Calendar size={14} /> DUE DATE
                </div>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ 
                    background: 'var(--bg-app)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)', 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Users size={14} /> TEAM ASSIGNEES
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                {selectedAssignees.map(aId => {
                  const user = board.users.find(u => u.id === aId);
                  if (!user) return null;
                  return (
                    <div key={user.id} style={{ background: 'var(--accent-primary)', color: 'white', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>{user.initials}</div>
                      {user.name}
                      <button type="button" onClick={() => toggleAssignee(user.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.8 }}>
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <select 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !selectedAssignees.includes(val)) {
                    setSelectedAssignees([...selectedAssignees, val]);
                  }
                  e.target.value = "";
                }}
                style={{ 
                  width: '100%', 
                  background: 'var(--bg-app)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">+ Add team member...</option>
                {board.users
                  .filter(u => !selectedAssignees.includes(u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Footer inside form */}
          <div style={{ 
            padding: '24px 40px', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '16px',
            background: 'rgba(0,0,0,0.05)',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '10px 24px' }}>Discard</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                padding: '10px 32px', 
                borderRadius: '12px', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)'
              }}
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
