interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', color = 'currentColor', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`inline-block ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        role="status"
        aria-label="読み込み中"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill={color}
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">読み込み中...</span>
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = '読み込み中...' }: FullPageLoadingProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[999999]"
      role="status"
      aria-label="読み込み中"
    >
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" color="#3B82F6" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

interface ButtonLoadingProps {
  message?: string;
}

export function ButtonLoading({ message = '処理中...' }: ButtonLoadingProps) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" color="currentColor" />
      <span>{message}</span>
    </div>
  );
}
