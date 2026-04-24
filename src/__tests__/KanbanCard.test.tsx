import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanCard } from '../components/Cards/KanbanCard';
import { TestProviders } from '../testUtils/TestProviders';
import { initialMockData } from '../mockData';

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
      <TestProviders>
        <KanbanCard card={mockCard} />
      </TestProviders>
    );

    expect(screen.getByText(mockCard.title)).toBeInTheDocument();
    expect(screen.getByText(mockCard.type)).toBeInTheDocument();
  });

  it('enters editing mode when edit button is clicked', () => {
    render(
      <TestProviders>
        <KanbanCard card={mockCard} />
      </TestProviders>
    );

    // Look for the button with the pen icon (Edit2)
    const editBtn = screen.getByRole('button', {
      name: (_, element) => element?.querySelector('.lucide-pen') !== null
    });

    fireEvent.click(editBtn);

    expect(screen.getByPlaceholderText('Title')).toHaveValue(mockCard.title);
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
  });

  it('displays overdue status when card is past due', () => {
    const overdueCard = {
      ...mockCard,
      dueDate: '2020-01-01' // Definitely in the past
    };

    render(
      <TestProviders>
        <KanbanCard card={overdueCard} />
      </TestProviders>
    );

    const clockIconContainer = screen.getByText(/late$/).parentElement;
    expect(clockIconContainer).toHaveStyle({ color: 'var(--error)' });
  });
});
