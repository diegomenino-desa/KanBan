import React, { useState } from 'react';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, KeyboardSensor, TouchSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanban } from '../../KanbanContext';
import { KanbanColumn } from '../Columns/KanbanColumn';
import { KanbanCard } from '../Cards/KanbanCard';
import { Plus } from 'lucide-react';
import { translations } from '../../i18n';
import { NewCardModal } from '../Cards/NewCardModal';

export const BoardArea: React.FC = () => {
  const { board, moveCard, reorderColumn, addColumn, reorderCard, lang, canEdit } = useKanban();
  const t = translations[lang];
  const [isAddingExpedite, setIsAddingExpedite] = useState(false);

  if (!board) return null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === 'Card' && over.data.current?.type === 'Column') {
      moveCard(active.id as string, over.id as string);
    } else if (active.data.current?.type === 'Card' && over.data.current?.type === 'Card') {
      if (active.id !== over.id) {
        const overCardColumnId = over.data.current.card.columnId;
        const activeCardColumnId = active.data.current.card.columnId;
        
        if (activeCardColumnId !== overCardColumnId) {
          moveCard(active.id as string, overCardColumnId);
        }
        reorderCard(active.id as string, over.id as string);
      }
    } else if (active.data.current?.type === 'Column' && over.data.current?.type === 'Column') {
      if (active.id !== over.id) {
        reorderColumn(active.id as string, over.id as string);
      }
    }
  };

  const expediteCards = board.cards.filter(c => c.type === 'Expedite');
  const regularCards = board.cards.filter(c => c.type !== 'Expedite');

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="board-wrapper">
        
        {/* Horizontal Swimlane for Expedite */}
        <div className={`swimlane-container ${expediteCards.length === 0 ? 'empty' : ''}`}>
          <div className="swimlane-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t.expediteLane}
            </div>
            {canEdit && (
              <button
                className="btn btn-ghost"
                onClick={() => setIsAddingExpedite(true)}
                style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--rausch)' }}
              >
                <Plus size={14} /> {t.addExpediteCard}
              </button>
            )}
          </div>
          <div className="swimlane-body">
            {expediteCards.length > 0 ? (
              expediteCards.map(card => (
                <div key={card.id} style={{ minWidth: '300px' }}>
                  <KanbanCard card={card} />
                </div>
              ))
            ) : (
              <div style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                {t.emptyExpediteLane}
              </div>
            )}
          </div>
        </div>

        {isAddingExpedite && (
          <NewCardModal 
            columnId={board.columns[0]?.id || ''} 
            onClose={() => setIsAddingExpedite(false)} 
          />
        )}

        <div className="board-scroll-area">
          <SortableContext items={board.columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {board.columns.map(col => (
              <KanbanColumn 
                key={col.id} 
                column={col} 
                cards={regularCards.filter(c => c.columnId === col.id)} 
              />
            ))}
          </SortableContext>

          {/* Add New Column Button — editors and admins only */}
          {canEdit && (
            <div style={{ minWidth: 'var(--column-width)', padding: '0' }}>
              <button
                onClick={() => { const title = prompt('Enter new column name:'); if (title) addColumn(title); }}
                style={{ width: '100%', height: '52px', border: '1px dashed var(--hairline)', borderRadius: 'var(--radius-lg)', background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--ash)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.1s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--rausch)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--rausch)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--hairline)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ash)'; }}
              >
                <Plus size={18} /> Add column
              </button>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
};
