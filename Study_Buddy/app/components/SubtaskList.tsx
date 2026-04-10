'use client';

import { useState } from 'react';
import { Subtask } from '../../lib/types';
import { addSubtask, toggleSubtask, updateSubtask, deleteSubtask } from '../../lib/taskService';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onUpdate: () => void;
}

export default function SubtaskList({ taskId, subtasks, onUpdate }: SubtaskListProps) {
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const allDone = subtasks.length > 0 && subtasks.every(s => s.completed);

  async function handleAdd() {
    if (!newName.trim()) return;
    if (newName.length > 100) {
      setAddError('Subtask name must be 100 characters or fewer.');
      return;
    }
    setAddError(null);
    try {
      await addSubtask(taskId, newName.trim());
      setNewName('');
      onUpdate();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add subtask.');
    }
  }

  async function handleToggle(subtask: Subtask) {
    setError(null);
    try {
      await toggleSubtask(subtask.id, !subtask.completed);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subtask.');
    }
  }

  async function handleEdit(subtaskId: string) {
    if (!editName.trim()) return;
    if (editName.length > 100) {
      setError('Subtask name must be 100 characters or fewer.');
      return;
    }
    setError(null);
    try {
      await updateSubtask(subtaskId, editName.trim());
      setEditingId(null);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subtask.');
    }
  }

  async function handleDelete(subtaskId: string) {
    setError(null);
    try {
      await deleteSubtask(subtaskId);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subtask.');
    }
  }

  return (
    <div className="subtask-list">
      <h4>Subtasks {allDone && <span className="all-done-badge">All done!</span>}</h4>

      {error && <p className="field-error">{error}</p>}

      {subtasks.map(subtask => (
        <div key={subtask.id} className="subtask-item">
          <input
            type="checkbox"
            checked={subtask.completed}
            onChange={() => handleToggle(subtask)}
            aria-label={`Mark "${subtask.name}" complete`}
          />
          {editingId === subtask.id ? (
            <>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={101}
              />
              <button onClick={() => handleEdit(subtask.id)}>Save</button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <span style={{ textDecoration: subtask.completed ? 'line-through' : 'none' }}>
                {subtask.name}
              </span>
              <button onClick={() => { setEditingId(subtask.id); setEditName(subtask.name); }}>Edit</button>
              <button onClick={() => handleDelete(subtask.id)}>Delete</button>
            </>
          )}
        </div>
      ))}

      <div className="subtask-add">
        <input
          type="text"
          placeholder="New subtask..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          maxLength={101}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd}>Add</button>
        {addError && <span className="field-error">{addError}</span>}
      </div>
    </div>
  );
}
