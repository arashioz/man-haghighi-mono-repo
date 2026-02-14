import React, { useEffect } from 'react';
import { useError } from '../contexts/ErrorContext';
import { setGlobalErrorHandler } from '../services/api';

const APIErrorHandler: React.FC = () => {
  const { addError } = useError();

  useEffect(() => {
    // Set up the global error handler
    setGlobalErrorHandler(addError);

    // Clean up on unmount (though this component should never unmount)
    return () => {
      setGlobalErrorHandler(() => {});
    };
  }, [addError]);

  return null; // This component doesn't render anything
};

export default APIErrorHandler;




