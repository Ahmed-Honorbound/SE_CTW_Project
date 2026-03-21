'use client';

import { useState, useEffect } from 'react';
import { TaskFormValues, ValidationErrors, Priority } from '../../lib/types';
import { validateTaskForm, isValid } from '../../lib/validation';
import { createTask, updateTask } from '../../lib/taskService';
import { supabase } from '../../lib/supabase';

interface TaskFormProps {
  taskId?: string;
  onSuccess?: () => void;
}

const defaultValues: TaskFormValues = {
  name: '',
  subject: '',
  due_date: '',
  priority: 'Medium',
  description: '',
};

export default function TaskForm({ taskId, onSuccess }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(defaultValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = Boolean(taskId);

  useEffect(() => {
    if (!taskId) return;
    supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        setValues({
          name: data.name,
          subject: data.subject,
          due_date: data.due_date,
          priority: data.priority as Priority,
          description: data.description ?? '',
        });
      });
  }, [taskId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateTaskForm(values);
    if (!isValid(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitStatus('idle');
    setSubmitError(null);

    try {
      if (isEditMode && taskId) {
        await updateTask(taskId, values);
      } else {
        await createTask(values);
      }
      setSubmitStatus('success');
      if (!isEditMode) setValues(defaultValues);
      onSuccess?.();
    } catch (err) {
      setSubmitStatus('error');
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <h2>{isEditMode ? 'Edit Task' : 'Add New Task'}</h2>

      {submitStatus === 'success' && (
        <p className="form-success">Task {isEditMode ? 'updated' : 'saved'} successfully.</p>
      )}
      {submitStatus === 'error' && submitError && (
        <p className="form-error">{submitError}</p>
      )}

      <div className="form-field">
        <label htmlFor="name">Task Name *</label>
        <input
          id="name"
          name="name"
          type="text"
          value={values.name}
          onChange={handleChange}
          maxLength={101}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && <span id="name-error" className="field-error">{errors.name}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="subject">Subject *</label>
        <input
          id="subject"
          name="subject"
          type="text"
          value={values.subject}
          onChange={handleChange}
          maxLength={50}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
        />
        {errors.subject && <span id="subject-error" className="field-error">{errors.subject}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="due_date">Due Date *</label>
        <input
          id="due_date"
          name="due_date"
          type="date"
          value={values.due_date}
          onChange={handleChange}
          aria-describedby={errors.due_date ? 'due-date-error' : undefined}
        />
        {errors.due_date && <span id="due-date-error" className="field-error">{errors.due_date}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="priority">Priority *</label>
        <select
          id="priority"
          name="priority"
          value={values.priority}
          onChange={handleChange}
          aria-describedby={errors.priority ? 'priority-error' : undefined}
        >
          <option value="">Select priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        {errors.priority && <span id="priority-error" className="field-error">{errors.priority}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          rows={4}
          maxLength={501}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && <span id="description-error" className="field-error">{errors.description}</span>}
      </div>

      <button type="submit" disabled={submitting} className="taskButton">
        {submitting ? 'Saving...' : isEditMode ? 'Update Task' : 'Save Task'}
      </button>
    </form>
  );
}
