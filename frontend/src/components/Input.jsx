import React, { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  type = 'text', 
  id, 
  className = '', 
  rightElement,
  ...props 
}, ref) => {
  const errorId = `${id}-error`;
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center">
        {label && (
          <label 
            htmlFor={id} 
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 select-none"
          >
            {label}
          </label>
        )}
      </div>
      
      <div className="relative flex items-center">
        <input
          ref={ref}
          type={type}
          id={id}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          className={`w-full px-4 py-3 rounded-xl border glass-input text-sm text-slate-900 placeholder-slate-400 font-medium ${
            error 
              ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' 
              : 'border-slate-200 focus:border-blue-600/50 focus:ring-blue-600/10'
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 z-10 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <span 
          id={errorId} 
          role="alert" 
          className="text-xs font-medium text-rose-400 mt-0.5"
        >
          {error.message || error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
