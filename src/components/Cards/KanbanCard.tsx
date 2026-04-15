import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCard as KanbanCardType, CardType } from '../../types';
import { useKanban } from '../../KanbanContext';
import { Clock, Edit2, Trash2, Check, X as XIcon, MessageSquare, Send } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  card: KanbanCardType;
}

export const KanbanCard: React.FC<Props> = ({ card }) => {
  const { board, updateCard, removeCard } = useKanban();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || '');
  const [editType, setEditType] = useState<CardType>(card.type);
  const [editAssignees, setEditAssignees] = useState<string[]>(card.assignees);
  const [editDueDate, setEditDueDate] = useState(card.dueDate || '');
  const [commentText, setCommentText] = useState('');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: {
      type: 'Card',
      card,
    }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const msInDay = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dueDays = 0;
  if (card.dueDate) {
    const dueDate = new Date(card.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    dueDays = Math.ceil((dueDate.getTime() - today.getTime()) / msInDay);
  }
  
  const isOverdue = card.dueDate && dueDays < 0;

  const handleSave = () => {
    updateCard(card.id, { 
      title: editTitle, 
      description: editDescription, 
      type: editType, 
      assignees: editAssignees,
      dueDate: editDueDate || undefined
    });
    setIsEditing(false);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: uuidv4(),
      userId: 'currentUser', // Mock user
      text: commentText.trim(),
      createdAt: Date.now()
    };
    updateCard(card.id, { comments: [...card.comments, newComment] });
    setCommentText('');
  };

  const handleCancel = () => {
    setEditTitle(card.title);
    setEditType(card.type);
    setEditAssignees(card.assignees);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`kanban-card`} style={style} ref={setNodeRef}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select 
            value={editType} 
            onChange={(e) => setEditType(e.target.value as CardType)}
            style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px', borderRadius: '4px' }}
          >
            <option value="Feature">Feature</option>
            <option value="Bug">Bug</option>
            <option value="Expedite">Expedite</option>
            <option value="TechDebt">TechDebt</option>
            <option value="Spike">Spike</option>
          </select>
          <textarea 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', resize: 'vertical', minHeight: '40px', fontWeight: 'bold' }}
          />
          <textarea 
            value={editDescription} 
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description"
            style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', resize: 'vertical', minHeight: '80px', fontSize: '0.85rem' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{color: 'var(--text-secondary)'}}>Assignees:</span>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {editAssignees.map(aId => {
                const user = board.users.find(u => u.id === aId);
                if (!user) return null;
                return (
                  <div key={user.id} style={{ background: 'var(--accent-primary)', color: 'white', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 500 }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{user.initials}</div>
                    {user.name}
                    <button onClick={() => setEditAssignees(editAssignees.filter(id => id !== aId))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.8 }}>
                      <XIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <select 
              className="btn btn-ghost"
              onChange={(e) => {
                const val = e.target.value;
                if (val && !editAssignees.includes(val)) {
                  setEditAssignees([...editAssignees, val]);
                }
                e.target.value = "";
              }}
              style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <option value="">+ Add team member...</option>
              {board.users
                .filter(u => !editAssignees.includes(u.id))
                .map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))
              }
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Due Date:</span>
            <input 
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Comments ({(card.comments || []).length})</span>
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', scrollbarWidth: 'thin' }}>
              {(card.comments || []).map(c => (
                <div key={c.id} style={{ background: 'var(--bg-board)', padding: '8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '2px', color: 'var(--accent-primary)' }}>You</div>
                  <div>{c.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                style={{ flex: 1, background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', fontSize: '0.8rem' }}
              />
              <button 
                type="button"
                onClick={handleAddComment}
                className="btn btn-primary"
                style={{ padding: '8px' }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <button className="btn btn-ghost" onClick={() => removeCard(card.id)} style={{ padding: '4px', color: 'var(--color-danger)' }} title="Delete"><Trash2 size={16} /></button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={handleCancel} style={{ padding: '4px' }}><XIcon size={16} /></button>
              <button className="btn btn-primary" onClick={handleSave} style={{ padding: '4px 8px' }}><Check size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="card-title">
          {card.title}
        </div>
        {card.description && (
          <div className="card-description" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {card.description}
          </div>
        )}
        <div className="card-header" style={{ position: 'relative', border: 'none', padding: 0 }}>
          <span className={`card-type-badge type-${card.type.toLowerCase()}`} style={{ background: '#1c2128', color: '#8b949e', border: '1px solid #30363d' }}>
            {card.type}
          </span>
          <button 
            className="btn btn-ghost" 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }} 
            style={{ padding: '4px', position: 'absolute', top: '8px', right: '8px', zIndex: 10, opacity: 0.6 }}
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="card-footer">
        <div className="card-assignees" style={{ display: 'flex', alignItems: 'center' }}>
          {card.assignees.map(aId => {
            const user = board.users.find(u => u.id === aId);
            if (!user) return null;
            return (
              <div key={user.id} className="card-assignee" title={user.name} style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>
                {user.initials}
              </div>
            );
          })}
        </div>

        <div className="card-footer-icons">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={14} />
            <span>{card.comments?.length || 0}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: isOverdue ? 'var(--color-danger)' : 'inherit',
            fontWeight: isOverdue ? 600 : 'normal'
          }}>
            <Clock size={14} />
            <span>{dueDays}d</span>
          </div>
        </div>
      </div>
    </div>
  );
};
