import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../components/Settings/SettingsModal';
import { KanbanProvider } from '../KanbanContext';
import React from 'react';

describe('SettingsModal', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
    // Mock window.confirm
    global.window.confirm = vi.fn(() => true);
    // Mock window.alert
    global.window.alert = vi.fn();
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

    expect(global.URL.createObjectURL).toHaveBeenCalled();
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
