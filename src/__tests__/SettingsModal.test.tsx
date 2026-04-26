import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../components/Settings/SettingsModal';
import { TestProviders } from '../testUtils/TestProviders';

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
      <TestProviders>
        <SettingsModal onClose={() => {}} />
      </TestProviders>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('allows an admin in local mode to add a new team member', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url === '/api/boards' && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/auth/users' && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/auth/me/preferences') {
        return new Response(JSON.stringify({ theme: 'light', lang: 'en' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/auth/users' && method === 'POST') {
        return new Response(
          JSON.stringify({ id: 'new-id', name: 'New Member', email: 'new@example.com', initials: 'NM', role: 'Editor' }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <TestProviders mode="local">
        <SettingsModal onClose={() => {}} />
      </TestProviders>
    );

    // The add-member form renders synchronously for admin+local users.
    const textInputs = screen.getAllByRole('textbox');
    fireEvent.change(textInputs[0], { target: { value: 'newmember' } });
    fireEvent.change(textInputs[1], { target: { value: 'New Member' } });
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'supersecret' } });

    fireEvent.click(screen.getByRole('button', { name: /add member/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/auth/users', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('hides the add-member form in non-local auth modes', () => {
    render(
      <TestProviders mode="ldap">
        <SettingsModal onClose={() => {}} />
      </TestProviders>
    );
    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument();
    expect(screen.getByText(/managed in your directory/i)).toBeInTheDocument();
  });

  it('handles export data', () => {
    const linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <TestProviders>
        <SettingsModal onClose={() => {}} />
      </TestProviders>
    );

    const exportButton = screen.getByText('Export Boards (JSON)');
    fireEvent.click(exportButton);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(linkClickSpy).toHaveBeenCalled();

    linkClickSpy.mockRestore();
  });

  it('switches theme', () => {
    render(
      <TestProviders>
        <SettingsModal onClose={() => {}} />
      </TestProviders>
    );

    const lightButton = screen.getByText('Light');
    fireEvent.click(lightButton);

    // After clicking Light, it should become the primary button
    expect(lightButton).toHaveClass('btn-primary');
  });
});
