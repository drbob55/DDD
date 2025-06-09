import { useState, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from './useDebounce';

type SetValue<T> = T | ((prevValue: T) => T);

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
) => {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialize(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serialize, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  return [storedValue, setValue, removeValue] as const;
};

// Specialized hook for form drafts
export const useFormDraft = <T extends object>(
  draftKey: string,
  defaultValues: T,
  options?: {
    autoSave?: boolean;
    autoSaveDelay?: number;
  }
) => {
  const { autoSave = true, autoSaveDelay = 1000 } = options || {};
  
  const [draft, setDraft, clearDraft] = useLocalStorage(draftKey, defaultValues);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { debouncedCallback: saveDraft } = useDebouncedCallback(
    (values: T) => {
      setDraft(values);
      setHasUnsavedChanges(false);
    },
    autoSaveDelay
  );

  const updateDraft = useCallback((values: T) => {
    setHasUnsavedChanges(true);
    if (autoSave) {
      saveDraft(values);
    }
  }, [autoSave, saveDraft]);

  return {
    draft,
    updateDraft,
    clearDraft,
    hasUnsavedChanges,
    saveDraft: () => saveDraft(draft)
  };
};