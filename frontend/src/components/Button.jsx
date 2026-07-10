import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const Button = ({ 
  children, 
  loading = false, 
  disabled = false, 
  type = 'button',
  variant = 'primary',
  className = '',
  ...props 
}) => {
  const isButtonDisabled = disabled || loading;

  const baseStyles = 'w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950';
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 border border-blue-500/20 shadow-blue-500/10 focus:ring-blue-500',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500'
  };

  return (
    <motion.button
      type={type}
      disabled={isButtonDisabled}
      whileHover={!isButtonDisabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!isButtonDisabled ? { scale: 0.98, y: 0 } : {}}
      className={`${baseStyles} ${variants[variant]} ${
        isButtonDisabled ? 'opacity-50 cursor-not-allowed select-none' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;
