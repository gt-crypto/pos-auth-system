import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { checkPasswordCriteria, calculatePasswordStrength } from '../utils/passwordRules.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';

export const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const [failMessage, setFailMessage] = useState('');

  const resetSchema = z.object({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'At least one lowercase letter')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[0-9]/, 'At least one number')
      .regex(/[^a-zA-Z0-9]/, 'At least one special character'),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(resetSchema),
    mode: 'onChange'
  });

  const watchPassword = watch('password', '');

  const onSubmit = async (data) => {
    try {
      const res = await resetPassword(token, data.password, data.confirmPassword);
      showToast(res.message || 'Password reset successful!', 'success');
      navigate('/'); // Redirect to login
    } catch (err) {
      setResetFailed(true);
      setFailMessage(err.message || 'Password reset link is invalid or has expired.');
      showToast(err.message || 'Reset failed', 'error');
    }
  };

  const strengthInfo = calculatePasswordStrength(watchPassword);
  const criteria = checkPasswordCriteria(watchPassword);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-800 overflow-hidden relative aurora-bg p-6">
      <div className="w-full max-w-md">
        
        {/* Logo Header */}
        <div className="flex items-center justify-center gap-2 mb-8 select-none">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-display">ApexPOS</span>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-2xl relative">
          
          {resetFailed ? (
            // ==========================================
            // FAILURE STATE DISPLAY
            // ==========================================
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center flex flex-col items-center gap-4 py-4"
            >
              <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ShieldAlert className="h-8 w-8" />
              </div>
              
              <h1 className="text-xl font-bold font-display text-slate-900">Reset Link Expired</h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
                {failMessage || 'This password reset link is invalid, malformed, or has expired. Please request a new link.'}
              </p>

              <Link 
                to="/" 
                className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </motion.div>
          ) : (
            // ==========================================
            // INPUT RESET PASSWORD FORM
            // ==========================================
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight font-display text-slate-900 text-center">Reset Password</h1>
                <p className="text-xs text-slate-500 font-medium text-center mt-1">Please enter your new password below</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input
                  label="New Password"
                  id="reset-pass"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  error={errors.password}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...register('password')}
                />

                {/* Password Strength Checklist */}
                {watchPassword && (
                  <div className="flex flex-col gap-2 p-3 bg-slate-50/60 rounded-xl border border-slate-200/60 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-500">Password Strength:</span>
                      <span className={
                        strengthInfo.score === 1 ? 'text-rose-600' :
                        strengthInfo.score === 2 ? 'text-amber-600' :
                        strengthInfo.score === 3 ? 'text-emerald-600' : 'text-slate-500'
                      }>
                        {strengthInfo.text}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strengthInfo.color} transition-all duration-300`} 
                        style={{ width: `${(strengthInfo.score / 3) * 100}%` }}
                      />
                    </div>
                    {/* Live checklist */}
                    <div className="grid grid-cols-2 gap-1.5 mt-1 font-medium text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        {criteria.hasUppercase ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-400" />}
                        Uppercase letter
                      </div>
                      <div className="flex items-center gap-1">
                        {criteria.hasLowercase ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-400" />}
                        Lowercase letter
                      </div>
                      <div className="flex items-center gap-1">
                        {criteria.hasNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-400" />}
                        Number
                      </div>
                      <div className="flex items-center gap-1">
                        {criteria.hasSpecialChar ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-400" />}
                        Special character
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        {criteria.isLongEnough ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-400" />}
                        Minimum length (8 chars)
                      </div>
                    </div>
                  </div>
                )}

                <Input
                  label="Confirm Password"
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  error={errors.confirmPassword}
                  {...register('confirmPassword')}
                />

                <Button type="submit" loading={isSubmitting}>
                  Save Password
                </Button>
              </form>

              <div className="text-center pt-2">
                <Link 
                  to="/" 
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel & Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
