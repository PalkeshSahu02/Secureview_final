import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Shield,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  X,
  Building2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import type { Invitation } from '../../types';

const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { acceptInvitation } = useAuth();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // PIN validation
  const isPinValid = pin.length === 4 && /^\d+$/.test(pin);
  const pinsMatch = pin === confirmPin && pin.length > 0;

  // Load invitation details
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setInvitationError('No invitation token provided');
        setIsLoadingInvitation(false);
        return;
      }

      try {
        const data = await authApi.getInvitation(token);
        setInvitation(data);
        if (data.name) {
          setName(data.name);
        }
      } catch (err) {
        console.error('Failed to load invitation:', err);
        setInvitationError('Invalid or expired invitation link');
      } finally {
        setIsLoadingInvitation(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    if (!isPinValid) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (!pinsMatch) {
      setError('PINs do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await acceptInvitation({
        token: token!,
        name,
        password,
        pin,
      });
      navigate('/verify-pin');
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (invitationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
          <p className="text-slate-600 mb-6">{invitationError}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const PasswordCheck = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center space-x-2 text-sm">
      {met ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <X className="w-4 h-4 text-slate-300" />
      )}
      <span className={met ? 'text-emerald-600' : 'text-slate-500'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500 rounded-full filter blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">SecureView</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-6">
            You're Invited!
          </h1>
          <p className="text-xl text-emerald-100/80 leading-relaxed">
            Join {invitation?.organization?.name || 'the team'} on SecureView - the secure document viewing platform.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Lock, text: 'End-to-end encrypted documents' },
            { icon: Shield, text: 'Advanced security features' },
            { icon: Building2, text: 'Enterprise-grade protection' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center space-x-3 text-emerald-100/70">
                <Icon className="w-5 h-5" />
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-md w-full">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">SecureView</span>
          </div>

          {/* Invitation Info */}
          {invitation && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-emerald-600 font-medium">You're joining</p>
                  <p className="text-lg font-semibold text-emerald-900">{invitation.organization?.name}</p>
                  <p className="text-sm text-emerald-700">as {invitation.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Your Account</h2>
          <p className="text-slate-600 mb-8">Complete your registration to get started</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-2">
                  <PasswordCheck met={hasMinLength} label="At least 8 characters" />
                  <PasswordCheck met={hasUppercase} label="One uppercase letter" />
                  <PasswordCheck met={hasLowercase} label="One lowercase letter" />
                  <PasswordCheck met={hasNumber} label="One number" />
                  <PasswordCheck met={hasSpecial} label="One special character" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                  required
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* PIN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">4-Digit PIN</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-lg tracking-widest"
                    placeholder="****"
                    maxLength={4}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm PIN</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-lg tracking-widest"
                    placeholder="****"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
            </div>
            {confirmPin && !pinsMatch && (
              <p className="text-sm text-red-600">PINs do not match</p>
            )}
            <p className="text-xs text-slate-500">Your PIN is required each time you log in for extra security</p>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid || !passwordsMatch || !isPinValid || !pinsMatch}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
