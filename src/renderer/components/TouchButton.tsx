import React, { useState, ReactNode } from 'react';
import '../styles/touch.css';

export interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  haptic = true,
  className = '',
  ariaLabel
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
      
      // Haptic feedback if available
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      info: 'bg-cyan-600 hover:bg-cyan-700 text-white'
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'touch-button-small',
      medium: 'touch-button',
      large: 'touch-button-large',
      xlarge: 'touch-button-xlarge'
    };
    return sizes[size];
  };

  const buttonClasses = `
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isPressed ? 'touch-feedback scale-95' : ''}
    ${className}
    relative
    font-semibold
    transition-all
    shadow-lg
    active:shadow-md
  `.trim();

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-3">
          <svg 
            className="animate-spin h-5 w-5" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </div>
      )}
    </button>
  );
};

// Icon Button variant
export interface TouchIconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  className?: string;
  ariaLabel: string;
}

export const TouchIconButton: React.FC<TouchIconButtonProps> = ({
  icon,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  haptic = true,
  className = '',
  ariaLabel
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
      
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      info: 'bg-cyan-600 hover:bg-cyan-700 text-white'
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'w-10 h-10',
      medium: 'w-12 h-12',
      large: 'w-16 h-16'
    };
    return sizes[size];
  };

  const buttonClasses = `
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isPressed ? 'touch-feedback scale-95' : ''}
    ${className}
    rounded-full
    flex
    items-center
    justify-center
    transition-all
    shadow-lg
    active:shadow-md
  `.trim();

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading ? (
        <svg 
          className="animate-spin h-5 w-5" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon
      )}
    </button>
  );
};