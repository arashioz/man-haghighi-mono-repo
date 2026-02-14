import React from 'react';
import { useError, ApiError } from '../contexts/ErrorContext';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useError();

  if (errors.length === 0) {
    return null;
  }

  const getErrorIcon = (statusCode?: number) => {
    if (!statusCode) return <AlertCircle className="h-5 w-5 text-red-500" />;

    if (statusCode >= 500) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (statusCode >= 400) return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const getErrorColor = (statusCode?: number) => {
    if (!statusCode) return 'border-red-200 bg-red-50 text-red-800';

    if (statusCode >= 500) return 'border-orange-200 bg-orange-50 text-orange-800';
    if (statusCode >= 400) return 'border-red-200 bg-red-50 text-red-800';
    return 'border-blue-200 bg-blue-50 text-blue-800';
  };

  const formatErrorDetails = (error: ApiError) => {
    const details: string[] = [];

    if (error.path && error.method) {
      details.push(`${error.method} ${error.path}`);
    }

    if (error.statusCode) {
      details.push(`کد وضعیت: ${error.statusCode}`);
    }

    if (process.env.NODE_ENV === 'development' && error.error) {
      details.push(`نوع خطا: ${error.error}`);
    }

    return details.length > 0 ? details.join(' • ') : '';
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2 max-w-2xl mx-auto">
      {errors.map((error, index) => (
        <div
          key={index}
          className={`flex items-start p-4 border rounded-lg shadow-lg transition-all duration-300 animate-in slide-in-from-top-2 ${getErrorColor(error.statusCode)}`}
          role="alert"
        >
          <div className="flex-shrink-0">
            {getErrorIcon(error.statusCode)}
          </div>

          <div className="mr-3 flex-1">
            <div className="text-sm font-medium">
              {error.message}
            </div>

            {formatErrorDetails(error) && (
              <div className="text-xs opacity-75 mt-1 font-mono">
                {formatErrorDetails(error)}
              </div>
            )}

            {process.env.NODE_ENV === 'development' && error.stack && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer hover:opacity-80">
                  جزئیات فنی (برای توسعه‌دهندگان)
                </summary>
                <pre className="text-xs mt-2 bg-black/10 p-2 rounded overflow-x-auto whitespace-pre-wrap font-mono">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          <button
            onClick={() => removeError(index)}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 transition-colors"
            aria-label="بستن پیام خطا"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ErrorDisplay;





