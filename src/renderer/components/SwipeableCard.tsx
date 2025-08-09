import React, { useState, useRef, ReactNode, useEffect } from 'react';
import '../styles/touch.css';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: ReactNode;
  color: 'primary' | 'success' | 'danger' | 'warning';
  action: () => void;
}

export interface SwipeableCardProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  haptic?: boolean;
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  haptic = true,
  className = ''
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);
  const [showLeftActions, setShowLeftActions] = useState(false);
  const [showRightActions, setShowRightActions] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || touchStartY.current === null) return;

    const currentTouch = e.targetTouches[0].clientX;
    const currentTouchY = e.targetTouches[0].clientY;
    
    // Calculate vertical movement to determine if it's a vertical scroll
    const verticalDistance = Math.abs(currentTouchY - touchStartY.current);
    const horizontalDistance = Math.abs(currentTouch - touchStart);
    
    // If vertical movement is greater, don't swipe
    if (verticalDistance > horizontalDistance) {
      return;
    }

    setTouchEnd(currentTouch);
    const distance = currentTouch - touchStart;
    setSwipeDistance(distance);

    if (distance > 0) {
      setIsSwipingRight(true);
      setIsSwipingLeft(false);
    } else {
      setIsSwipingLeft(true);
      setIsSwipingRight(false);
    }

    // Show action buttons when swiping
    if (distance > minSwipeDistance && leftActions.length > 0) {
      setShowLeftActions(true);
    } else if (distance < -minSwipeDistance && rightActions.length > 0) {
      setShowRightActions(true);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchEnd - touchStart;
    const isLeftSwipe = distance < -minSwipeDistance;
    const isRightSwipe = distance > minSwipeDistance;

    if (isLeftSwipe && Math.abs(distance) > swipeThreshold) {
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
      if (onSwipeLeft) {
        onSwipeLeft();
      }
    }

    if (isRightSwipe && Math.abs(distance) > swipeThreshold) {
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
      if (onSwipeRight) {
        onSwipeRight();
      }
    }

    // Reset swipe state
    setTimeout(() => {
      setSwipeDistance(0);
      setIsSwipingLeft(false);
      setIsSwipingRight(false);
      setShowLeftActions(false);
      setShowRightActions(false);
    }, 300);

    setTouchStart(null);
    setTouchEnd(null);
    touchStartY.current = null;
  };

  const handleActionClick = (action: SwipeAction) => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    action.action();
    
    // Reset state after action
    setSwipeDistance(0);
    setShowLeftActions(false);
    setShowRightActions(false);
  };

  const getActionColorClasses = (color: string) => {
    const colors = {
      primary: 'bg-blue-600 text-white',
      success: 'bg-green-600 text-white',
      danger: 'bg-red-600 text-white',
      warning: 'bg-yellow-500 text-white'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  const cardStyle = {
    transform: `translateX(${swipeDistance * 0.5}px)`,
    transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none'
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Actions */}
      {showLeftActions && leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center">
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`
                h-full px-6 flex flex-col items-center justify-center gap-2
                ${getActionColorClasses(action.color)}
                transition-all duration-300
              `}
              style={{
                opacity: Math.min(1, Math.abs(swipeDistance) / 100),
                transform: `translateX(${Math.min(0, swipeDistance - 100)}px)`
              }}
            >
              {action.icon && <span className="text-2xl">{action.icon}</span>}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {showRightActions && rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`
                h-full px-6 flex flex-col items-center justify-center gap-2
                ${getActionColorClasses(action.color)}
                transition-all duration-300
              `}
              style={{
                opacity: Math.min(1, Math.abs(swipeDistance) / 100),
                transform: `translateX(${Math.max(0, swipeDistance + 100)}px)`
              }}
            >
              {action.icon && <span className="text-2xl">{action.icon}</span>}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Card */}
      <div
        ref={cardRef}
        className={`
          touch-card
          ${className}
          ${isSwipingLeft ? 'shadow-xl' : ''}
          ${isSwipingRight ? 'shadow-xl' : ''}
          relative
          z-10
          bg-white
        `}
        style={cardStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// Simple card without swipe functionality
export interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  elevated?: boolean;
  padding?: 'small' | 'medium' | 'large';
  className?: string;
}

export const TouchCard: React.FC<TouchCardProps> = ({
  children,
  onClick,
  elevated = true,
  padding = 'medium',
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const getPaddingClasses = () => {
    const paddings = {
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6'
    };
    return paddings[padding];
  };

  return (
    <div
      className={`
        touch-card
        ${getPaddingClasses()}
        ${elevated ? 'shadow-lg' : 'shadow-sm'}
        ${isPressed ? 'scale-98 shadow-md' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
        bg-white
        rounded-2xl
        transition-all
        duration-200
      `}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {children}
    </div>
  );
};