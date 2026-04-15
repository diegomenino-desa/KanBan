import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useKanban } from '../../KanbanContext';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const mockCfdData = [
  { day: 'Mon', 'Done': 5, 'Review': 2, 'In Progress': 3, 'To Do': 15 },
  { day: 'Tue', 'Done': 6, 'Review': 3, 'In Progress': 4, 'To Do': 14 },
  { day: 'Wed', 'Done': 8, 'Review': 1, 'In Progress': 5, 'To Do': 12 },
  { day: 'Thu', 'Done': 10, 'Review': 4, 'In Progress': 4, 'To Do': 9 },
  { day: 'Fri', 'Done': 15, 'Review': 1, 'In Progress': 3, 'To Do': 8 },
];

const mockThroughputData = [
  { week: 'W1', Features: 4, Bugs: 2, TechDebt: 1 },
  { week: 'W2', Features: 6, Bugs: 1, TechDebt: 2 },
  { week: 'W3', Features: 3, Bugs: 5, TechDebt: 0 },
  { week: 'W4', Features: 8, Bugs: 2, TechDebt: 3 },
];

export const Dashboard: React.FC<Props> = ({ onClose }) => {
  useKanban();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="analytics-modal glass-panel" onClick={e => e.stopPropagation()} style={{ width: '85%', height: '85%', borderRadius: '32px', padding: '48px', display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Analytics Dashboard</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Key Metrics */}
          <div className="kanban-card">
            <h3>Cycle Time (Average)</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginTop: '8px' }}>4.2 Days</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Time spent in Active columns</p>
          </div>

          <div className="kanban-card">
            <h3>Lead Time (Average)</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-feature)', marginTop: '8px' }}>9.5 Days</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Time from Request to Done</p>
          </div>

          {/* CFD Chart */}
          <div className="kanban-card" style={{ gridColumn: '1 / -1', height: '300px' }}>
            <h3 style={{ marginBottom: '16px' }}>Cumulative Flow Diagram</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockCfdData}>
                <XAxis dataKey="day" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-board)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                <Area type="monotone" dataKey="Review" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Area type="monotone" dataKey="To Do" stackId="1" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Throughput Chart */}
          <div className="kanban-card" style={{ gridColumn: '1 / -1', height: '300px' }}>
            <h3 style={{ marginBottom: '16px' }}>Throughput</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockThroughputData}>
                <XAxis dataKey="week" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-board)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="Features" stackId="a" fill="var(--color-feature)" />
                <Bar dataKey="Bugs" stackId="a" fill="var(--color-bug)" />
                <Bar dataKey="TechDebt" stackId="a" fill="var(--color-techdebt)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
};
