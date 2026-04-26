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

  if (!board) return null;

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
        width: '680px',
        maxWidth: '95%',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.06) 0 4px 12px 0, rgba(0,0,0,0.16) 0 12px 32px 0',
        overflow: 'hidden',
        background: 'var(--canvas)',
        border: '1px solid var(--hairline)',
      }}>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Card title"
                style={{ width: '100%', fontSize: '1.6rem', fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--ink)', outline: 'none', padding: '0', fontFamily: 'inherit', letterSpacing: '-0.02em' }}
                required
              />
              <button type="button" className="btn-icon" onClick={onClose} style={{ marginTop: '-4px', marginRight: '-8px', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>
            
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              style={{ width: '100%', fontSize: '0.95rem', border: 'none', background: 'transparent', color: 'var(--ash)', outline: 'none', resize: 'none', lineHeight: 1.6, padding: '0', fontFamily: 'inherit', fontWeight: 500 }}
            />
          </div>

          {/* Properties */}
          <div style={{ padding: '20px 32px', borderTop: '1px solid var(--hairline)', background: 'var(--soft-cloud)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--ash)' }}>
                  <Flag size={12} /> CATEGORY
                </div>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as CardType)}
                  style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}
                >
                  {cardTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--ash)' }}>
                  <Calendar size={12} /> DUE DATE
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--ash)' }}>
                <Users size={12} /> ASSIGNEES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedAssignees.map(aId => {
                  const user = board.users.find(u => u.id === aId);
                  if (!user) return null;
                  return (
                    <div key={user.id} style={{ background: 'var(--rausch)', color: '#fff', padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                      {user.name}
                      <button type="button" onClick={() => toggleAssignee(user.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.8 }}>
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !selectedAssignees.includes(val)) setSelectedAssignees([...selectedAssignees, val]);
                  e.target.value = '';
                }}
                style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', color: 'var(--ash)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}
              >
                <option value="">+ Add team member…</option>
                {board.users.filter(u => !selectedAssignees.includes(u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--hairline)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px', fontWeight: 600 }}>
              Create card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
