import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BiometricAuth from '../components/BiometricAuth';

// ── SVG Illustrations ────────────────────────────────────────────
function LoginIllustration() {
  return (
    <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm">
      {/* Background shapes */}
      <circle cx="250" cy="250" r="200" fill="#EBF5FF" />
      <circle cx="250" cy="250" r="150" fill="#DBEAFE" />

      {/* Monitor */}
      <rect x="140" y="120" width="220" height="160" rx="12" fill="#1E40AF" />
      <rect x="150" y="130" width="200" height="135" rx="6" fill="#FFFFFF" />

      {/* Screen content - chart bars */}
      <rect x="170" y="210" width="25" height="40" rx="3" fill="#3B82F6" />
      <rect x="205" y="190" width="25" height="60" rx="3" fill="#60A5FA" />
      <rect x="240" y="170" width="25" height="80" rx="3" fill="#2563EB" />
      <rect x="275" y="185" width="25" height="65" rx="3" fill="#3B82F6" />
      <rect x="310" y="200" width="25" height="50" rx="3" fill="#93C5FD" />

      {/* Dashboard header on screen */}
      <rect x="165" y="140" width="80" height="8" rx="4" fill="#E5E7EB" />
      <rect x="165" y="155" width="55" height="6" rx="3" fill="#F3F4F6" />
      <circle cx="325" cy="145" r="8" fill="#10B981" />

      {/* Monitor stand */}
      <rect x="230" y="280" width="40" height="30" rx="2" fill="#6B7280" />
      <rect x="205" y="305" width="90" height="8" rx="4" fill="#9CA3AF" />

      {/* Floating elements */}
      <rect x="80" y="180" width="50" height="50" rx="10" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
      <text x="97" y="212" fontSize="20" fill="#2563EB" fontWeight="bold" textAnchor="middle">$</text>

      <rect x="370" y="160" width="50" height="50" rx="10" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" />
      <path d="M385 185 L393 193 L405 177" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <rect x="100" y="300" width="45" height="45" rx="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <text x="122" y="328" fontSize="16" fill="#D97706" fontWeight="bold" textAnchor="middle">%</text>

      <rect x="365" y="280" width="45" height="45" rx="10" fill="#FCE7F3" stroke="#EC4899" strokeWidth="2" />
      <path d="M380 302 L395 302 M387 295 L387 310" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Small decorative dots */}
      <circle cx="120" cy="140" r="4" fill="#93C5FD" />
      <circle cx="390" cy="130" r="3" fill="#6EE7B7" />
      <circle cx="110" cy="260" r="3" fill="#FCD34D" />
      <circle cx="400" cy="240" r="4" fill="#F9A8D4" />

      {/* Bottom text area */}
      <text x="250" y="380" fontSize="16" fill="#1E40AF" fontWeight="600" textAnchor="middle" fontFamily="system-ui">Complete Business Suite</text>
      <text x="250" y="402" fontSize="11" fill="#6B7280" textAnchor="middle" fontFamily="system-ui">Invoicing, Inventory, Payroll, GST &amp; More</text>
    </svg>
  );
}

export default function LoginPage() {
  const { login, register, biometricLogin } = useAuth();
  const navigate = useNavigate();

  // 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState('login');

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password fields
  const [resetEmail, setResetEmail] = useState('');

  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setUsername('');
    setPassword('');
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setResetEmail('');
    setShowPassword(false);
    setShowSignupPassword(false);
  };

  const switchMode = (newMode) => {
    resetFields();
    setMode(newMode);
  };

  // ---- Login handler ----
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Sign-up handler ----
  const handleSignup = async (e) => {
    e.preventDefault();

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim() || !signupConfirmPassword.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: signupEmail,
        password: signupPassword,
        email: signupEmail,
        display_name: signupName,
      });
      toast.success('Account created successfully! Welcome!');
      navigate('/', { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Forgot password handler ----
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      toast.success('If an account with that email exists, a reset link has been sent.');
      switchMode('login');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Biometric login success handler ----
  const handleBiometricLoginSuccess = useCallback(({ token, user }) => {
    biometricLogin({ token, user });
    navigate('/', { replace: true });
  }, [biometricLogin, navigate]);

  // ---- Eye icon for password toggle ----
  const EyeIcon = ({ show, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      tabIndex={-1}
    >
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left Panel: Branding + Illustration ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col items-center justify-center px-12 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30 shadow-lg">
              <span className="text-white font-bold text-3xl">N</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">NavoditaERP</h1>
            <p className="text-blue-100 text-sm">Enterprise Resource Planning for Modern Indian Businesses</p>
          </div>

          {/* Illustration */}
          <div className="mb-8">
            <LoginIllustration />
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '📊', label: 'GST Compliant' },
              { icon: '💰', label: 'Smart Invoicing' },
              { icon: '🏦', label: 'Bank Sync' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 border border-white/10">
                <span className="text-xl">{f.icon}</span>
                <p className="text-white text-xs font-medium mt-1">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">NavoditaERP</h1>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p className="text-sm text-gray-500 mt-1.5">
              {mode === 'login'
                ? 'Sign in to access your business dashboard'
                : mode === 'signup'
                  ? 'Get started with NavoditaERP today'
                  : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {/* ========== LOGIN FORM ========== */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username or Email
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                             placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                               placeholder-gray-400 transition-all"
                  />
                  <EyeIcon show={showPassword} onClick={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-semibold text-sm rounded-xl
                           hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 shadow-sm shadow-blue-600/25
                           disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>

              {/* Biometric / Fingerprint Login */}
              <BiometricAuth
                username={username}
                onLoginSuccess={handleBiometricLoginSuccess}
                mode="login"
              />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">New to NavoditaERP?</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="w-full py-3 px-4 text-blue-600 font-semibold text-sm rounded-xl border-2 border-blue-100
                           hover:bg-blue-50 hover:border-blue-200 transition-all duration-150 cursor-pointer"
              >
                Create an account
              </button>
            </form>
          )}

          {/* ========== SIGN UP FORM ========== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  autoFocus
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                             placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                             placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                               placeholder-gray-400 transition-all"
                  />
                  <EyeIcon show={showSignupPassword} onClick={() => setShowSignupPassword(!showSignupPassword)} />
                </div>
                {signupPassword.length > 0 && signupPassword.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                             placeholder-gray-400 transition-all"
                />
                {signupConfirmPassword.length > 0 && signupPassword !== signupConfirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-semibold text-sm rounded-xl
                           hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 shadow-sm shadow-blue-600/25
                           disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-blue-600 font-semibold hover:text-blue-700 focus:outline-none"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ========== FORGOT PASSWORD FORM ========== */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-sm text-blue-700">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              </div>

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white
                             placeholder-gray-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-semibold text-sm rounded-xl
                           hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 shadow-sm shadow-blue-600/25
                           disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full py-3 px-4 text-gray-600 font-medium text-sm rounded-xl border border-gray-200
                           hover:bg-gray-50 transition-all duration-150 cursor-pointer"
              >
                Back to Sign in
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Navodita Enterprises &copy; {new Date().getFullYear()}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
