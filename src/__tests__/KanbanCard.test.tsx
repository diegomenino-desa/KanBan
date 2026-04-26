import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  it('renders card details correctly', async () => {
    render(
      <TestProviders>
        <KanbanCard card={mockCard} />
      </TestProviders>
    );

    expect(await screen.findByText(mockCard.title)).toBeInTheDocument();
    expect(screen.getByText(mockCard.type)).toBeInTheDocument();
  });

  it('enters editing mode when edit button is clicked', async () => {
    render(
      <TestProviders>
        <KanbanCard card={mockCard} />
      </TestProviders>
    );

    const editBtn = await screen.findByRole('button', {
      name: (_, element) => element?.querySelector('.lucide-pen') !== null
    });

    fireEvent.click(editBtn);

    expect(screen.getByPlaceholderText('Title')).toHaveValue(mockCard.title);
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
  });

  it('displays overdue status when card is past due', async () => {
    const overdueCard = {
      ...mockCard,
      dueDate: '2020-01-01' // Definitely in the past
    };

    render(
      <TestProviders>
        <KanbanCard card={overdueCard} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/late$/)).toBeInTheDocument();
    });
    const clockIconContainer = screen.getByText(/late$/).parentElement;
    expect(clockIconContainer).toHaveStyle({ color: 'var(--error)' });
  });
});
