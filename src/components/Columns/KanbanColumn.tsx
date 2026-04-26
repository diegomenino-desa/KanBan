import React, { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '../../types';
import { KanbanCard } from '../Cards/KanbanCard';
import { Plus, Check, X as XIcon, Trash2, MoreVertical } from 'lucide-react';
import { NewCardModal } from '../Cards/NewCardModal';
import { useKanban } from '../../KanbanContext';

interface Props {
  column: KanbanColumnType;
  cards: KanbanCardType[];
}

export const KanbanColumn: React.FC<Props> = ({ column, cards }) => {
  const { updateColumn, removeColumn, canEdit } = useKanban();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editWipLimit, setEditWipLimit] = useState(column.wipLimit);
  const [editDod, setEditDod] = useState(column.dod);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const { isOver, setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    backgroundColor: isOver && !isDragging ? 'var(--border-hover)' : undefined
  };

  const isOverLimit = column.wipLimit > 0 && cards.length > column.wipLimit;

  const handleSave = () => {
    updateColumn(column.id, {
      title: editTitle,
      wipLimit: Number(editWipLimit),
      dod: editDod
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(column.title);
    setEditWipLimit(column.wipLimit);
    setEditDod(column.dod);
    setIsEditing(false);
  };

  return (
    <div 
      className={`kanban-column ${isOverLimit ? 'over-limit' : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <div className="column-header" style={{ position: 'relative' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Column Name"
              style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', width: '100%' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--ash)', fontWeight: 600 }}>WIP limit:</span>
              <input
                type="number"
                value={editWipLimit}
                onChange={e => setEditWipLimit(Number(e.target.value))}
                style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '6px 8px', width: '64px', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontWeight: 500, fontSize: '0.88rem' }}
                min="0"
              />
            </div>
            <textarea
              value={editDod}
              onChange={e => setEditDod(e.target.value)}
              placeholder="Definition of Done"
              style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', color: 'var(--ink)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', fontWeight: 500 }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
              <button className="btn btn-ghost" onClick={() => removeColumn(column.id)} style={{ padding: '6px 10px', color: 'var(--error)', fontSize: '0.82rem' }} title="Delete Column"><Trash2 size={14} /></button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={handleCancel} style={{ padding: '6px 10px' }}><XIcon size={14} /></button>
                <button className="btn btn-primary" onClick={handleSave} style={{ padding: '6px 14px', fontSize: '0.85rem' }}><Check size={14} /> Save</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="column-title-container" {...attributes} {...listeners} style={{ flex: 1, cursor: 'grab' }}>
              <span className="column-title">{column.title}</span>
              <span className={`column-count ${isOverLimit ? 'over-limit' : ''}`}>
                {cards.length}
                {column.wipLimit > 0 && (
                  <span style={{ fontSize: '0.8em', opacity: 0.75 }}> / {column.wipLimit}</span>
                )}
              </span>
            </div>
            {canEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button className="btn-icon btn-icon-sm" onClick={() => setIsAddingCard(true)} title="Add card">
                  <Plus size={14} />
                </button>
                <button className="btn-icon btn-icon-sm" onClick={() => setIsEditing(true)} title="Edit column">
                  <MoreVertical size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="column-body">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {canEdit && (
          <button
            className="btn add-card-btn"
            onClick={() => setIsAddingCard(true)}
            style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <Plus size={16} /> Add card
          </button>
        )}
      </div>

      {isAddingCard && (
        <NewCardModal 
          columnId={column.id} 
          onClose={() => setIsAddingCard(false)} 
        />
      )}
    </div>
  );
};
