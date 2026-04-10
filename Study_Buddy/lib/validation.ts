import { TaskFormValues, ValidationErrors } from './types';

export function validateTaskForm(values: TaskFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!values.name || values.name.trim() === '') {
    errors.name = 'Task name is required.';
  } else if (values.name.length > 100) {
    errors.name = 'Task name must be 100 characters or fewer.';
  }

  if (!values.subject || values.subject.trim() === '') {
    errors.subject = 'Subject is required.';
  }

  if (!values.due_date || values.due_date.trim() === '') {
    errors.due_date = 'Due date is required.';
  }

  if (!values.priority) {
    errors.priority = 'Priority is required.';
  }

  if (values.description && values.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.';
  }

  return errors;
}

export function isValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
