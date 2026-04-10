import { describe, it, expect } from 'vitest';
import { validateTaskForm } from '../lib/validation';
import { TaskFormValues } from '../lib/types';

const valid: TaskFormValues = {
  name: 'Math Homework',
  subject: 'Math',
  due_date: '2026-12-01',
  priority: 'Medium',
  description: '',
};

describe('validateTaskForm', () => {
  it('returns no errors for a fully valid input', () => {
    expect(validateTaskForm(valid)).toEqual({});
  });

  it('returns error when name is empty', () => {
    const errors = validateTaskForm({ ...valid, name: '' });
    expect(errors.name).toBeDefined();
  });

  it('returns error when name is whitespace only', () => {
    const errors = validateTaskForm({ ...valid, name: '   ' });
    expect(errors.name).toBeDefined();
  });

  it('accepts name at exactly 100 characters', () => {
    const errors = validateTaskForm({ ...valid, name: 'a'.repeat(100) });
    expect(errors.name).toBeUndefined();
  });

  it('returns error when name exceeds 100 characters', () => {
    const errors = validateTaskForm({ ...valid, name: 'a'.repeat(101) });
    expect(errors.name).toBeDefined();
  });

  it('returns error when subject is empty', () => {
    const errors = validateTaskForm({ ...valid, subject: '' });
    expect(errors.subject).toBeDefined();
  });

  it('returns error when due_date is empty', () => {
    const errors = validateTaskForm({ ...valid, due_date: '' });
    expect(errors.due_date).toBeDefined();
  });

  it('returns error when priority is empty', () => {
    const errors = validateTaskForm({ ...valid, priority: '' as any });
    expect(errors.priority).toBeDefined();
  });

  it('accepts description at exactly 500 characters', () => {
    const errors = validateTaskForm({ ...valid, description: 'a'.repeat(500) });
    expect(errors.description).toBeUndefined();
  });

  it('returns error when description exceeds 500 characters', () => {
    const errors = validateTaskForm({ ...valid, description: 'a'.repeat(501) });
    expect(errors.description).toBeDefined();
  });

  it('returns multiple errors when multiple fields are invalid', () => {
    const errors = validateTaskForm({ name: '', subject: '', due_date: '', priority: '' as any, description: '' });
    expect(errors.name).toBeDefined();
    expect(errors.subject).toBeDefined();
    expect(errors.due_date).toBeDefined();
    expect(errors.priority).toBeDefined();
  });
});
