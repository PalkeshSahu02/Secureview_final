import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Building, User, Mail, Lock, Eye, EyeOff, Hash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    organization_name: '',
    admin_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate PIN
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        organization_name: formData.organization_name,
        admin_name: formData.admin_name,
        email: formData.email,
        password: formData.password,
        pin: formData.pin,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">Register Your Organization</h1>
          <p className="text-secondary-600 mt-2">Create a secure space for your documents</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Organization Name"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              placeholder="Acme Corporation"
              leftIcon={<Building className="w-5 h-5" />}
              required
            />

            <Input
              label="Your Name"
              name="admin_name"
              value={formData.admin_name}
              onChange={handleChange}
              placeholder="John Doe"
              leftIcon={<User className="w-5 h-5" />}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              leftIcon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              leftIcon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              helperText="At least 8 characters with uppercase, lowercase, number, and special character"
              required
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              leftIcon={<Lock className="w-5 h-5" />}
              required
            />

            <Input
              label="4-Digit PIN"
              name="pin"
              type="password"
              value={formData.pin}
              onChange={handleChange}
              placeholder="••••"
              maxLength={4}
              leftIcon={<Hash className="w-5 h-5" />}
              helperText="You'll use this PIN to verify sensitive actions"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Organization
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-secondary-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
