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

  const inputStyle: React.CSSProperties = {
    background: 'var(--canvas)',
    border: '1px solid var(--hairline)',
    color: 'var(--ink)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    width: '100%',
    resize: 'vertical' as const,
  };

  if (isEditing) {
    return (
      <div className="kanban-card" style={style} ref={setNodeRef}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value as CardType)}
            style={{ ...inputStyle, resize: undefined }}
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
            style={{ ...inputStyle, minHeight: '44px', fontWeight: 600 }}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{ ...inputStyle, minHeight: '72px' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--ash)', fontWeight: 600 }}>Assignees</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {editAssignees.map(aId => {
                const user = board.users.find(u => u.id === aId);
                if (!user) return null;
                return (
                  <div key={user.id} style={{ background: 'var(--rausch)', color: '#fff', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                    {user.name}
                    <button onClick={() => setEditAssignees(editAssignees.filter(id => id !== aId))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.8 }}>
                      <XIcon size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val && !editAssignees.includes(val)) setEditAssignees([...editAssignees, val]);
                e.target.value = '';
              }}
              style={{ ...inputStyle, resize: undefined }}
            >
              <option value="">+ Add team member…</option>
              {board.users.filter(u => !editAssignees.includes(u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--ash)', fontWeight: 600 }}>Due Date</span>
            <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} style={{ ...inputStyle, resize: undefined }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', borderTop: '1px solid var(--hairline)', paddingTop: '14px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>Comments ({(card.comments || []).length})</span>
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(card.comments || []).map(c => (
                <div key={c.id} style={{ background: 'var(--soft-cloud)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.72rem', marginBottom: '3px', color: 'var(--rausch)' }}>You</div>
                  <div style={{ color: 'var(--ink)' }}>{c.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                style={{ ...inputStyle, resize: undefined, flex: 1 }}
              />
              <button type="button" onClick={handleAddComment} className="btn btn-primary" style={{ padding: '0 14px', borderRadius: 'var(--radius-sm)' }}>
                <Send size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button className="btn btn-ghost" onClick={() => removeCard(card.id)} style={{ padding: '6px 10px', color: 'var(--error)', fontSize: '0.82rem' }} title="Delete">
              <Trash2 size={14} />
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={handleCancel} style={{ padding: '6px 10px' }}><XIcon size={14} /></button>
              <button className="btn btn-primary" onClick={handleSave} style={{ padding: '6px 14px', fontSize: '0.85rem' }}><Check size={14} /> Save</button>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span className={`card-type-badge type-${card.type.toLowerCase()}`}>{card.type}</span>
        <button
          className="btn-icon btn-icon-sm"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          style={{ flexShrink: 0 }}
          title="Edit"
        >
          <Edit2 size={12} />
        </button>
      </div>

      <div className="card-title">{card.title}</div>

      {card.description && (
        <div style={{ fontSize: '0.83rem', color: 'var(--ash)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
          {card.description}
        </div>
      )}

      <div className="card-footer">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {card.assignees.map(aId => {
            const user = board.users.find(u => u.id === aId);
            if (!user) return null;
            return (
              <div key={user.id} className="card-assignee" title={user.name}>
                {user.initials}
              </div>
            );
          })}
        </div>

        <div className="card-footer-icons">
          {(card.comments?.length || 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={13} />
              <span>{card.comments?.length}</span>
            </div>
          )}
          {card.dueDate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isOverdue ? 'var(--error)' : 'var(--ash)',
              fontWeight: isOverdue ? 700 : 500,
            }}>
              <Clock size={13} />
              <span>{Math.abs(dueDays)}d {isOverdue ? 'late' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
