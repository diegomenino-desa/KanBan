import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../components/Settings/SettingsModal';
import { KanbanProvider } from '../KanbanContext';

describe('SettingsModal', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(),
      revokeObjectURL: vi.fn(),
    });
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
  });

  it('renders correctly', () => {
    render(
      <KanbanProvider>
        <SettingsModal onClose={() => {}} />
      </KanbanProvider>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('allows adding a new team member', () => {
    render(
      <KanbanProvider>
        <SettingsModal onClose={() => {}} />
      </KanbanProvider>
    );

    const input = screen.getByPlaceholderText('Add New Member');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'New Member' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New Member')).toBeInTheDocument();
  });

  it('handles export data', () => {
    const linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <KanbanProvider>
        <SettingsModal onClose={() => {}} />
      </KanbanProvider>
    );

    const exportButton = screen.getByText('Export Boards (JSON)');
    fireEvent.click(exportButton);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(linkClickSpy).toHaveBeenCalled();

    linkClickSpy.mockRestore();
  });

  it('switches theme', () => {
    render(
      <KanbanProvider>
        <SettingsModal onClose={() => {}} />
      </KanbanProvider>
    );

    const lightButton = screen.getByText('Light');
    fireEvent.click(lightButton);

    // After clicking Light, it should become the primary button
    expect(lightButton).toHaveClass('btn-primary');
  });
});
