import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanCard } from '../components/Cards/KanbanCard';
import { KanbanProvider } from '../KanbanContext';
import { initialMockData } from '../mockData';
import React from 'react';

// Mock dnd-kit since it doesn't work well in jsdom/vitest without complex setup
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: vi.fn(),
    },
  },
}));

const mockCard = initialMockData.cards[0];

describe('KanbanCard', () => {
  it('renders card details correctly', () => {
    render(
      <KanbanProvider>
        <KanbanCard card={mockCard} />
      </KanbanProvider>
    );

    expect(screen.getByText(mockCard.title)).toBeInTheDocument();
    expect(screen.getByText(mockCard.type)).toBeInTheDocument();
  });

  it('enters editing mode when edit button is clicked', () => {
    render(
      <KanbanProvider>
        <KanbanCard card={mockCard} />
      </KanbanProvider>
    );

    // Look for the button with the pen icon (Edit2)
    const editBtn = screen.getByRole('button', {
      name: (content, element) => element?.querySelector('.lucide-pen') !== null
    });

    fireEvent.click(editBtn);

    expect(screen.getByPlaceholderText('Title')).toHaveValue(mockCard.title);
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
  });

  it('displays overdue status when card is past due', () => {
    const overdueCard = {
      ...mockCard,
      dueDate: '2020-01-01' // Definitely in the past
    };

    render(
      <KanbanProvider>
        <KanbanCard card={overdueCard} />
      </KanbanProvider>
    );

    const clockIconContainer = screen.getByText(/d$/).parentElement;
    expect(clockIconContainer).toHaveStyle({ color: 'var(--color-danger)' });
  });
});
