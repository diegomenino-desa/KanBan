import React, { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '../../types';
import { KanbanCard } from '../Cards/KanbanCard';
import { Plus, Info, Edit2, Check, X as XIcon, Trash2, GripHorizontal, MoreVertical } from 'lucide-react';
import { NewCardModal } from '../Cards/NewCardModal';
import { useKanban } from '../../KanbanContext';

interface Props {
  column: KanbanColumnType;
  cards: KanbanCardType[];
}

export const KanbanColumn: React.FC<Props> = ({ column, cards }) => {
  const { updateColumn, removeColumn, addCard } = useKanban();
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
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px' }} 
              placeholder="Column Name" 
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>WIP:</span>
              <input 
                type="number" 
                value={editWipLimit} 
                onChange={e => setEditWipLimit(Number(e.target.value))} 
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', width: '60px', borderRadius: '4px' }} 
                min="0"
              />
            </div>
            <textarea 
              value={editDod} 
              onChange={e => setEditDod(e.target.value)} 
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'vertical', minHeight: '60px' }} 
              placeholder="Definition of Done"
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
              <button className="btn btn-ghost" onClick={() => removeColumn(column.id)} style={{ padding: '4px', color: 'var(--color-danger)' }} title="Delete Column"><Trash2 size={16} /></button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={handleCancel} style={{ padding: '4px' }}><XIcon size={16} /></button>
                <button className="btn btn-primary" onClick={handleSave} style={{ padding: '4px 8px' }}><Check size={16} /></button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="column-title-container" {...attributes} {...listeners} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'grab' }}>
              <span className="column-title" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{column.title}</span>
              <span className={`column-count ${isOverLimit ? 'over-limit' : ''}`}>
                {cards.length}
                {column.wipLimit > 0 && (
                  <span style={{ fontSize: '0.7em', color: 'inherit', marginLeft: '4px', opacity: 0.8 }}>
                    / {column.wipLimit}
                  </span>
                )}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                className="btn btn-ghost p-1" 
                onClick={() => setIsAddingCard(true)}
              >
                <Plus size={18} />
              </button>
              <button className="btn btn-ghost p-1" onClick={() => setIsEditing(true)}>
                <MoreVertical size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="column-body">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        <button 
          className="btn add-card-btn" 
          onClick={() => setIsAddingCard(true)}
          style={{ width: '100%', marginTop: '12px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '16px' }}
        >
          <Plus size={18} /> Add New Card
        </button>
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
