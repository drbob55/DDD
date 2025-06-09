import { useState, useCallback, useEffect } from 'react';
import { DeepPartial, ValidationError } from '@/types';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Record<keyof T, string> | Promise<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  enableReinitialize?: boolean;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValidating: boolean;
  isDirty: boolean;
  isValid: boolean;
  submitCount: number;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  enableReinitialize = false
}: UseFormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isDirty: false,
    isValid: true,
    submitCount: 0
  });

  // Reset form with new initial values
  useEffect(() => {
    if (enableReinitialize) {
      setState(prev => ({
        ...prev,
        values: initialValues,
        isDirty: false
      }));
    }
  }, [initialValues, enableReinitialize]);

  // Validate all fields
  const validateForm = useCallback(async (values: T) => {
    if (!validate) return {};

    setState(prev => ({ ...prev, isValidating: true }));
    
    try {
      const errors = await validate(values);
      setState(prev => ({
        ...prev,
        errors,
        isValid: Object.keys(errors).length === 0,
        isValidating: false
      }));
      return errors;
    } catch (error) {
      setState(prev => ({ ...prev, isValidating: false }));
      throw error;
    }
  }, [validate]);

  // Validate single field
  const validateField = useCallback(async (name: keyof T, value: any) => {
    if (!validate) return;

    const values = { ...state.values, [name]: value };
    const errors = await validate(values);
    
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [name]: errors[name]
      }
    }));
  }, [validate, state.values]);

  // Handle field change
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [name]: fieldValue
      },
      isDirty: true
    }));

    if (validateOnChange) {
      validateField(name as keyof T, fieldValue);
    }
  }, [validateOnChange, validateField]);

  // Handle field blur
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;

    setState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [name]: true
      }
    }));

    if (validateOnBlur) {
      validateField(name as keyof T, state.values[name as keyof T]);
    }
  }, [validateOnBlur, validateField, state.values]);

  // Set field value
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [name]: value
      },
      isDirty: true
    }));

    if (validateOnChange) {
      validateField(name, value);
    }
  }, [validateOnChange, validateField]);

  // Set multiple field values
  const setFieldValues = useCallback((values: DeepPartial<T>) => {
    setState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        ...values
      },
      isDirty: true
    }));

    if (validateOnChange) {
      validateForm({ ...state.values, ...values } as T);
    }
  }, [validateOnChange, validateForm, state.values]);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: string) => {
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [name]: error
      }
    }));
  }, []);

  // Set field touched
  const setFieldTouched = useCallback((name: keyof T, touched = true) => {
    setState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [name]: touched
      }
    }));
  }, []);

  // Touch all fields
  const touchAll = useCallback(() => {
    const touched = Object.keys(state.values).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {} as Record<keyof T, boolean>);

    setState(prev => ({ ...prev, touched }));
  }, [state.values]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    setState(prev => ({
      ...prev,
      isSubmitting: true,
      submitCount: prev.submitCount + 1
    }));

    touchAll();

    try {
      const errors = await validateForm(state.values);
      
      if (Object.keys(errors).length === 0) {
        await onSubmit(state.values);
        setState(prev => ({ ...prev, isSubmitting: false }));
      } else {
        setState(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, isSubmitting: false }));
      throw error;
    }
  }, [state.values, validateForm, onSubmit, touchAll]);

  // Reset form
  const resetForm = useCallback((values?: T) => {
    setState({
      values: values || initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValidating: false,
      isDirty: false,
      isValid: true,
      submitCount: 0
    });
  }, [initialValues]);

  // Get field props
  const getFieldProps = useCallback((name: keyof T) => ({
    name,
    value: state.values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    error: state.touched[name] ? state.errors[name] : undefined
  }), [state.values, state.errors, state.touched, handleChange, handleBlur]);

  // Check if field has error
  const hasError = useCallback((name: keyof T) => {
    return !!(state.touched[name] && state.errors[name]);
  }, [state.touched, state.errors]);

  return {
    // Form state
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    isDirty: state.isDirty,
    isValid: state.isValid,
    submitCount: state.submitCount,
    
    // Form handlers
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    
    // Field methods
    setFieldValue,
    setFieldValues,
    setFieldError,
    setFieldTouched,
    getFieldProps,
    hasError,
    
    // Validation
    validateForm,
    validateField
  };
}

// Validation utilities
export const validators = {
  required: (message = 'This field is required') => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return '';
  },

  email: (message = 'Invalid email address') => (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return '';
  },

  minLength: (min: number, message?: string) => (value: string) => {
    if (value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return '';
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    if (value.length > max) {
      return message || `Must be at most ${max} characters`;
    }
    return '';
  },

  pattern: (regex: RegExp, message = 'Invalid format') => (value: string) => {
    if (!regex.test(value)) {
      return message;
    }
    return '';
  },

  compose: (...validators: Array<(value: any) => string>) => (value: any) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return '';
  }
};