import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  GitBranch, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  Check, 
  X, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { checkPasswordCriteria, calculatePasswordStrength } from '../utils/passwordRules.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import posCashier from '../assets/pos-cashier.png';

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const LoginRegister = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  
  // Parallax mouse movement states (for left feature cards)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 4;
    const centerY = window.innerHeight / 2;
    setMousePos({
      x: (clientX - centerX) / 60,
      y: (clientY - centerY) / 60
    });
  };

  const { login, forgotPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ==========================================
  // LOGIN FORM CONFIG
  // ==========================================
  const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional()
  });

  const { 
    register: registerLogin, 
    handleSubmit: handleLoginSubmit, 
    formState: { errors: loginErrors, isSubmitting: isLoggingIn } 
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onLogin = async (data) => {
    try {
      await login(data.username, data.password, Boolean(data.rememberMe));
      navigate('/dashboard', { replace: true });
      showToast('Logged in successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Invalid username or password', 'error');
    }
  };

  // ==========================================
  // REGISTER FORM CONFIG
  // ==========================================
  const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    username: z.string()
      .min(4, 'Username must be at least 4 characters')
      .max(20, 'Username cannot exceed 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'At least one lowercase letter')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[0-9]/, 'At least one number')
      .regex(/[^a-zA-Z0-9]/, 'At least one special character'),
    confirmPassword: z.string(),
    inviteCode: z.string().optional()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

  const { 
    register: registerUser, 
    handleSubmit: handleRegisterSubmit, 
    watch: watchRegister,
    formState: { errors: registerErrors, isSubmitting: isRegistering },
    reset: resetRegisterForm
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange'
  });

  const watchPassword = watchRegister('password', '');
  const watchUsername = watchRegister('username', '');
  const watchEmail = watchRegister('email', '');

  // Live availability checks
  const debouncedUsername = useDebounce(watchUsername, 500);
  const debouncedEmail = useDebounce(watchEmail, 500);

  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailChecking, setEmailChecking] = useState(false);

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 4 || !/^[a-zA-Z0-9_]+$/.test(debouncedUsername)) {
      setUsernameAvailable(null);
      return;
    }
    const checkUsernameAvail = async () => {
      setUsernameChecking(true);
      try {
        const res = await api.get(`/auth/check-username/${debouncedUsername}`);
        setUsernameAvailable(res.data.data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    };
    checkUsernameAvail();
  }, [debouncedUsername]);

  useEffect(() => {
    if (!debouncedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail)) {
      setEmailAvailable(null);
      return;
    }
    const checkEmailAvail = async () => {
      setEmailChecking(true);
      try {
        const res = await api.get(`/auth/check-email/${debouncedEmail}`);
        setEmailAvailable(res.data.data.available);
      } catch {
        setEmailAvailable(null);
      } finally {
        setEmailChecking(false);
      }
    };
    checkEmailAvail();
  }, [debouncedEmail]);

  const onRegister = async (data) => {
    try {
      const res = await api.post('/auth/register', data);
      showToast(res.data.message || 'Registration successful!', 'success');
      resetRegisterForm();
      setIsRegister(false); // Switch back to login
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    }
  };

  // ==========================================
  // FORGOT PASSWORD MODAL
  // ==========================================
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingForgot, setSendingForgot] = useState(false);

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast('Please enter your email', 'warning');
      return;
    }
    setSendingForgot(true);
    try {
      const res = await forgotPassword(forgotEmail);
      showToast(res.message || 'Reset link sent.', 'success');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      showToast(err.message || 'Request failed', 'error');
    } finally {
      setSendingForgot(false);
    }
  };

  // Password Strength Indicators
  const strengthInfo = calculatePasswordStrength(watchPassword);
  const criteria = checkPasswordCriteria(watchPassword);

  return (
    <div 
      className="min-h-screen w-full flex overflow-x-hidden overflow-y-auto relative"
      style={{ 
        backgroundImage: `url(${posCashier})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Background image is completely sharp and vibrant, z-0 layer removed */}
      
      {/* Relative container on top of background image */}
      <div 
        className="w-full min-h-screen flex flex-col lg:flex-row relative z-10 items-start lg:items-stretch"
        onMouseMove={handleMouseMove}
      >
        
        {/* LEFT SIDE: Feature info with subtle dark gradient overlay for legibility of light text */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10 border-r border-white/10 bg-gradient-to-r from-slate-950/50 via-slate-950/20 to-transparent">
          {/* Branding logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm font-display">
              Apexify
            </span>
          </div>

          {/* Dynamic parallax text section with drop shadows for high contrast readability */}
          <motion.div 
            style={{ x: mousePos.x, y: mousePos.y }}
            className="flex flex-col gap-6 my-auto max-w-lg"
          >
            <h2 className="text-4xl font-extrabold tracking-tight font-display text-white leading-tight [text-shadow:_0_2px_4px_rgba(0,0,0,0.5)]">
              Smart POS &<br />Inventory Platform
            </h2>
            <p className="text-sm text-slate-100 font-medium leading-relaxed [text-shadow:_0_1px_2px_rgba(0,0,0,0.4)]">
              Manage your restaurant, billing, inventory, and business operations from one intelligent cloud dashboard.
            </p>
          </motion.div>

          {/* Feature Cards / Branding text */}
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card glass-card-hover p-4 rounded-xl flex flex-col gap-2 border-white/20 bg-white/5">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <h3 className="text-xs font-bold tracking-wide uppercase text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.2)]">Secure Auth</h3>
                <p className="text-[11px] text-slate-300 font-medium">HttpOnly Session guards</p>
              </div>
              <div className="glass-card glass-card-hover p-4 rounded-xl flex flex-col gap-2 border-white/20 bg-white/5">
                <GitBranch className="h-6 w-6 text-sky-400" />
                <h3 className="text-xs font-bold tracking-wide uppercase text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.2)]">Multi-Branch</h3>
                <p className="text-[11px] text-slate-300 font-medium">Real-time sync cloud</p>
              </div>
              <div className="glass-card glass-card-hover p-4 rounded-xl flex flex-col gap-2 border-white/20 bg-white/5">
                <Sparkles className="h-6 w-6 text-purple-400" />
                <h3 className="text-xs font-bold tracking-wide uppercase text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.2)]">Smart Stock</h3>
                <p className="text-[11px] text-slate-300 font-medium">Low stock smart warnings</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-medium mt-2 [text-shadow:_0_1px_1px_rgba(0,0,0,0.3)]">
              &copy; {new Date().getFullYear()} Apexify Platform. All rights reserved.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Card Authenticator Form */}
        <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center p-6 py-8 lg:py-6 relative z-10">
          <div className="w-full max-w-md">
            
            {/* Mobile Branding */}
            <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 [text-shadow:_0_1px_2px_rgba(255,255,255,0.6)]">Apexify</span>
            </div>

            {/* Form Container: True Transparent Glassmorphic Panel (rgba(255,255,255,0.1), strong blur, white/18 border) */}
            <div className="glass-card rounded-3xl p-8 border border-white/15 shadow-[0_20px_50px_rgba(15,23,42,0.12),_0_30px_70px_-10px_rgba(99,102,241,0.15)] relative overflow-hidden">
              
              <AnimatePresence mode="wait">
                {!isRegister ? (
                  // ==========================================
                  // LOGIN SCREEN CARD
                  // ==========================================
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="text-center lg:text-left">
                      <h1 className="text-2xl font-extrabold tracking-tight font-display text-slate-950 dark:text-white [text-shadow:_0_1px_1px_rgba(255,255,255,0.6)] dark:[text-shadow:none]">Welcome Back</h1>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mt-1">Sign in to continue to your dashboard</p>
                    </div>

                    <form onSubmit={handleLoginSubmit(onLogin)} className="flex flex-col gap-4">
                      <Input
                        label="Username"
                        id="login-username"
                        placeholder="Enter username"
                        error={loginErrors.username}
                        {...registerLogin('username')}
                      />

                      <Input
                        label="Password"
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        error={loginErrors.password}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-500 hover:text-slate-700 p-1 rounded focus:outline-none"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                        {...registerLogin('password')}
                      />

                      <div className="flex items-center justify-between text-xs font-bold">
                        <label className="flex items-center gap-2 text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 bg-white/40 backdrop-blur-sm accent-blue-600 focus:ring-blue-600"
                            {...registerLogin('rememberMe')}
                          />
                          Remember Me
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowForgotModal(true)}
                          className="text-blue-700 dark:text-blue-400 hover:text-blue-600 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      <Button type="submit" loading={isLoggingIn}>
                        Sign In <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>

                    <div className="flex items-center justify-center gap-2 border-t border-slate-900/10 pt-4 mt-2">
                      <span className="text-xs text-slate-600 font-semibold">New to Apexify?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegister(true);
                          setShowPassword(false);
                        }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-600 transition-colors"
                      >
                        Create Account
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  // ==========================================
                  // REGISTER SCREEN CARD
                  // ==========================================
                  <motion.div
                    key="register-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="text-center lg:text-left">
                      <h1 className="text-2xl font-extrabold tracking-tight font-display text-slate-950 dark:text-white [text-shadow:_0_1px_1px_rgba(255,255,255,0.6)] dark:[text-shadow:none]">Create Account</h1>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mt-1">Get started with a free cashier account</p>
                    </div>

                    <form onSubmit={handleRegisterSubmit(onRegister)} className="flex flex-col gap-3">
                      <Input
                        label="Full Name"
                        id="reg-name"
                        placeholder="John Doe"
                        error={registerErrors.name}
                        {...registerUser('name')}
                      />

                      <Input
                        label="Email Address"
                        id="reg-email"
                        placeholder="you@example.com"
                        error={registerErrors.email}
                        rightElement={
                          emailChecking ? (
                            <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
                          ) : emailAvailable === true ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : emailAvailable === false ? (
                            <X className="h-4 w-4 text-rose-600" />
                          ) : null
                        }
                        {...registerUser('email')}
                      />

                      <Input
                        label="Username"
                        id="reg-username"
                        placeholder="letters, numbers, underscore"
                        error={registerErrors.username}
                        rightElement={
                          usernameChecking ? (
                            <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
                          ) : usernameAvailable === true ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : usernameAvailable === false ? (
                            <X className="h-4 w-4 text-rose-600" />
                          ) : null
                        }
                        {...registerUser('username')}
                      />

                      <Input
                        label="Password"
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 8 characters"
                        error={registerErrors.password}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded focus:outline-none"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                        {...registerUser('password')}
                      />

                      {/* Dynamic Password Strength Widget */}
                      {watchPassword && (
                        <div className="flex flex-col gap-2 p-3 bg-white/20 backdrop-blur-md rounded-xl border border-slate-200/40 text-xs">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-600">Password Strength:</span>
                            <span className={
                              strengthInfo.score === 1 ? 'text-rose-600' :
                              strengthInfo.score === 2 ? 'text-amber-600' :
                              strengthInfo.score === 3 ? 'text-emerald-600' : 'text-slate-500'
                            }>
                              {strengthInfo.text}
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-white/40 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${strengthInfo.color} transition-all duration-300`} 
                              style={{ width: `${(strengthInfo.score / 3) * 100}%` }}
                            />
                          </div>
                          {/* Live Checklist */}
                          <div className="grid grid-cols-2 gap-1.5 mt-1 font-bold text-[10px] text-slate-700">
                            <div className="flex items-center gap-1">
                              {criteria.hasUppercase ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-500" />}
                              Uppercase letter
                            </div>
                            <div className="flex items-center gap-1">
                              {criteria.hasLowercase ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-500" />}
                              Lowercase letter
                            </div>
                            <div className="flex items-center gap-1">
                              {criteria.hasNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-500" />}
                              Number
                            </div>
                            <div className="flex items-center gap-1">
                              {criteria.hasSpecialChar ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-500" />}
                              Special character
                            </div>
                            <div className="flex items-center gap-1 col-span-2">
                              {criteria.isLongEnough ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-500" />}
                              Minimum length (8 chars)
                            </div>
                          </div>
                        </div>
                      )}

                      <Input
                        label="Confirm Password"
                        id="reg-confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        error={registerErrors.confirmPassword}
                        {...registerUser('confirmPassword')}
                      />

                      <Input
                        label="Access Code (Optional)"
                        id="reg-invite"
                        placeholder=""
                        error={registerErrors.inviteCode}
                        {...registerUser('inviteCode')}
                      />

                      <Button type="submit" loading={isRegistering}>
                        Register Account
                      </Button>
                    </form>

                    <div className="flex items-center justify-center gap-2 border-t border-slate-900/10 dark:border-white/10 pt-4 mt-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Already have an account?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegister(false);
                          setShowPassword(false);
                        }}
                        className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        Sign In
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-3xl w-full max-w-sm p-6 relative z-10 border border-white/20 dark:border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-display text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-700 dark:text-blue-400" /> Forgot Password
                </h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 focus:outline-none"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-450 mb-4 font-medium leading-relaxed">
                Provide your registered email address below. If the account exists, we will email a password reset link (valid for 15 minutes).
              </p>

              <form onSubmit={handleForgotRequest} className="flex flex-col gap-4">
                <Input
                  label="Registered Email"
                  id="forgot-email"
                  type="email"
                  placeholder="name@domain.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />

                <Button type="submit" loading={sendingForgot}>
                  Send Reset Link
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginRegister;
