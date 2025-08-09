import React, { useState, useEffect } from 'react';
import { TouchButton } from './TouchButton';
import '../styles/touch.css';

export interface TouchKeypadProps {
  onValueChange?: (value: string) => void;
  onEnter?: (value: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  maxLength?: number;
  allowDecimal?: boolean;
  allowNegative?: boolean;
  haptic?: boolean;
  displayCurrency?: boolean;
  currencySymbol?: string;
  title?: string;
  placeholder?: string;
  className?: string;
}

export const TouchKeypad: React.FC<TouchKeypadProps> = ({
  onValueChange,
  onEnter,
  onCancel,
  initialValue = '',
  maxLength = 10,
  allowDecimal = true,
  allowNegative = false,
  haptic = true,
  displayCurrency = false,
  currencySymbol = '₺',
  title,
  placeholder = '0',
  className = ''
}) => {
  const [value, setValue] = useState(initialValue);
  const [isNegative, setIsNegative] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleHaptic = () => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleNumberClick = (num: string) => {
    handleHaptic();
    
    if (value.length >= maxLength) return;
    
    // Don't allow multiple zeros at the beginning
    if (value === '0' && num === '0') return;
    
    // Replace initial zero with new number
    if (value === '0' && num !== '.') {
      const newValue = num;
      setValue(newValue);
      onValueChange?.(newValue);
      return;
    }
    
    const newValue = value + num;
    setValue(newValue);
    onValueChange?.(newValue);
  };

  const handleDecimalClick = () => {
    if (!allowDecimal) return;
    if (value.includes('.')) return;
    
    handleHaptic();
    
    const newValue = value === '' ? '0.' : value + '.';
    setValue(newValue);
    onValueChange?.(newValue);
  };

  const handleBackspace = () => {
    handleHaptic();
    
    if (value.length === 0) return;
    
    const newValue = value.slice(0, -1);
    setValue(newValue);
    onValueChange?.(newValue);
  };

  const handleClear = () => {
    handleHaptic();
    setValue('');
    setIsNegative(false);
    onValueChange?.('');
  };

  const handleNegativeToggle = () => {
    if (!allowNegative) return;
    
    handleHaptic();
    setIsNegative(!isNegative);
    
    const newValue = isNegative ? value.replace('-', '') : '-' + value;
    setValue(newValue);
    onValueChange?.(newValue);
  };

  const handleEnter = () => {
    handleHaptic();
    const finalValue = isNegative && !value.startsWith('-') ? '-' + value : value;
    onEnter?.(finalValue || '0');
  };

  const handleCancel = () => {
    handleHaptic();
    setValue('');
    setIsNegative(false);
    onCancel?.();
  };

  const formatDisplay = (val: string) => {
    if (!val) return placeholder;
    
    if (displayCurrency) {
      // Format as currency
      const numVal = parseFloat(val || '0');
      if (!isNaN(numVal)) {
        return `${currencySymbol} ${numVal.toLocaleString('tr-TR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })}`;
      }
    }
    
    return val;
  };

  const keypadButtons = [
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '0', label: '0', span: allowDecimal ? 1 : 2 },
  ];

  return (
    <div className={`bg-white rounded-2xl shadow-2xl p-6 ${className}`}>
      {title && (
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {title}
        </h3>
      )}
      
      {/* Display */}
      <div className="bg-gray-100 rounded-xl p-6 mb-6">
        <div className="text-3xl font-bold text-gray-800 text-right min-h-[48px] flex items-center justify-end">
          {formatDisplay(value)}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Number buttons */}
        {keypadButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => handleNumberClick(btn.value)}
            className={`
              touch-button
              bg-gray-200
              hover:bg-gray-300
              active:bg-gray-400
              text-gray-800
              text-2xl
              font-bold
              rounded-xl
              min-h-[72px]
              transition-all
              ${btn.span === 2 ? 'col-span-2' : ''}
            `}
          >
            {btn.label}
          </button>
        ))}

        {/* Decimal button */}
        {allowDecimal && (
          <button
            onClick={handleDecimalClick}
            disabled={value.includes('.')}
            className={`
              touch-button
              bg-gray-200
              hover:bg-gray-300
              active:bg-gray-400
              text-gray-800
              text-2xl
              font-bold
              rounded-xl
              min-h-[72px]
              transition-all
              ${value.includes('.') ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            .
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {/* Clear button */}
        <button
          onClick={handleClear}
          className="
            touch-button
            bg-red-500
            hover:bg-red-600
            active:bg-red-700
            text-white
            font-bold
            rounded-xl
            min-h-[64px]
            transition-all
            flex
            items-center
            justify-center
            gap-2
          "
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Temizle</span>
        </button>

        {/* Backspace button */}
        <button
          onClick={handleBackspace}
          className="
            touch-button
            bg-yellow-500
            hover:bg-yellow-600
            active:bg-yellow-700
            text-white
            font-bold
            rounded-xl
            min-h-[64px]
            transition-all
            flex
            items-center
            justify-center
            gap-2
          "
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
          <span>Sil</span>
        </button>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          className="
            touch-button
            bg-green-600
            hover:bg-green-700
            active:bg-green-800
            text-white
            font-bold
            rounded-xl
            min-h-[64px]
            transition-all
            flex
            items-center
            justify-center
            gap-2
          "
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Tamam</span>
        </button>
      </div>

      {/* Optional negative toggle */}
      {allowNegative && (
        <div className="mt-4">
          <button
            onClick={handleNegativeToggle}
            className={`
              w-full
              touch-button
              ${isNegative ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'}
              hover:opacity-90
              font-bold
              rounded-xl
              min-h-[56px]
              transition-all
            `}
          >
            {isNegative ? '− Negatif' : '+ Pozitif'}
          </button>
        </div>
      )}

      {/* Cancel button if provided */}
      {onCancel && (
        <div className="mt-4">
          <button
            onClick={handleCancel}
            className="
              w-full
              touch-button
              bg-gray-600
              hover:bg-gray-700
              text-white
              font-bold
              rounded-xl
              min-h-[56px]
              transition-all
            "
          >
            İptal
          </button>
        </div>
      )}
    </div>
  );
};

// Compact version for inline use
export const CompactTouchKeypad: React.FC<TouchKeypadProps> = (props) => {
  return (
    <TouchKeypad
      {...props}
      className="max-w-sm mx-auto"
    />
  );
};