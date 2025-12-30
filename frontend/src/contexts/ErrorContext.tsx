import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ApiError {
  message: string;
  statusCode?: number;
  path?: string;
  method?: string;
  timestamp?: string;
  error?: string;
  stack?: string;
}

export interface ErrorState {
  errors: ApiError[];
  addError: (error: ApiError | string) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

const ErrorContext = createContext<ErrorState | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ApiError[]>([]);

  const addError = useCallback((error: ApiError | string) => {
    if (typeof error === 'string') {
      setErrors(prev => [...prev, { message: error }]);
    } else {
      setErrors(prev => [...prev, error]);
    }

    // Auto-remove error after 8 seconds
    setTimeout(() => {
      setErrors(prev => prev.slice(1));
    }, 8000);
  }, []);

  const removeError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value: ErrorState = {
    errors,
    addError,
    removeError,
    clearErrors,
    hasErrors: errors.length > 0,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
