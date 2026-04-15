import type { BoardData } from './types';
import { v4 as uuidv4 } from 'uuid';

export const initialMockData: BoardData = {
  id: 'board-1',
  name: 'Engineering Alpha',
  users: [
    { id: 'u1', name: 'Alice Smith', initials: 'AS', role: 'Admin' },
    { id: 'u2', name: 'Bob Jones', initials: 'BJ', role: 'Editor' },
    { id: 'u3', name: 'Charlie Dave', initials: 'CD', role: 'Viewer' }
  ],
  columns: [
    { id: 'col-todo', title: 'To Do', wipLimit: 10, dod: 'Task is groomed and ready for dev.' },
    { id: 'col-dev', title: 'In Progress', wipLimit: 3, dod: 'PR created and all unit tests passing.' },
    { id: 'col-review', title: 'Code Review', wipLimit: 2, dod: 'Approved by 2 peers.' },
    { id: 'col-done', title: 'Done', wipLimit: 0, dod: 'Deployed to production.' }
  ],
  cards: [
    {
      id: uuidv4(),
      title: 'Update to new Vite architecture',
      type: 'TechDebt',
      columnId: 'col-dev',
      assignees: ['u1'],
      createdAt: Date.now() - 86400000 * 5,
      enteredColumnAt: Date.now() - 86400000 * 2,
    },
    {
      id: uuidv4(),
      title: 'Fix critical auth vulnerability',
      type: 'Expedite',
      columnId: 'col-todo',
      assignees: ['u2'],
      createdAt: Date.now() - 3600000,
      enteredColumnAt: Date.now() - 3600000,
    },
    {
      id: uuidv4(),
      title: 'Dark mode styling broken on mobile',
      type: 'Bug',
      columnId: 'col-review',
      assignees: ['u1', 'u3'],
      createdAt: Date.now() - 86400000 * 10,
      enteredColumnAt: Date.now() - 86400000 * 4,
    },
    {
      id: uuidv4(),
      title: 'Add User Avatars',
      type: 'Feature',
      columnId: 'col-todo',
      assignees: [],
      createdAt: Date.now() - 86400000,
      enteredColumnAt: Date.now() - 86400000,
    }
  ]
};
