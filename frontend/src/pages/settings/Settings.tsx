import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Lock,
  Shield,
  Bell,
  Palette,
  Building2,
  Key,
  Mail,
  Phone,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/users';
import { cn } from '../../utils/cn';

type TabType = 'profile' | 'security' | 'notifications' | 'appearance';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();

  // Determine active tab from URL or default to profile
  const getInitialTab = (): TabType => {
    const path = location.pathname;
    if (path.includes('/security')) return 'security';
    if (path.includes('/notifications')) return 'notifications';
    if (path.includes('/appearance')) return 'appearance';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // PIN form
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [showCurrentPIN, setShowCurrentPIN] = useState(false);
  const [showNewPIN, setShowNewPIN] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await usersApi.updateProfile({ name, phone: phone || undefined });
      await refreshUser();
      showMessage('success', 'Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showMessage('error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      await usersApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      showMessage('success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Failed to change password:', err);
      showMessage('error', 'Failed to change password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePIN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPIN !== confirmPIN) {
      showMessage('error', 'New PINs do not match');
      return;
    }
    if (newPIN.length !== 4 || !/^\d+$/.test(newPIN)) {
      showMessage('error', 'PIN must be exactly 4 digits');
      return;
    }
    setIsLoading(true);
    try {
      await usersApi.changePIN({ current_pin: currentPIN, new_pin: newPIN });
      showMessage('success', 'PIN changed successfully');
      setCurrentPIN('');
      setNewPIN('');
      setConfirmPIN('');
    } catch (err) {
      console.error('Failed to change PIN:', err);
      showMessage('error', 'Failed to change PIN. Please check your current PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: User },
    { id: 'security' as const, name: 'Security', icon: Shield },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
    { id: 'appearance' as const, name: 'Appearance', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500">Manage your account preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Feedback Messages */}
        {(success || error) && (
          <div className={cn(
            'mb-6 p-4 rounded-xl flex items-center space-x-3',
            success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          )}>
            {success ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <p className={success ? 'text-emerald-700' : 'text-red-700'}>
              {success || error}
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center w-full px-4 py-3 rounded-xl text-left transition-all duration-200',
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 mr-3', activeTab === tab.id ? 'text-white' : 'text-slate-400')} />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* User Card */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <span className="text-2xl font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                    {user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                  <p className="text-sm text-slate-500">Update your personal details</p>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="Your name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Organization
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={user?.organization?.name || ''}
                          disabled
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
                        <p className="text-sm text-slate-500">Update your account password</p>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            placeholder="Enter new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                      >
                        <Lock className="w-5 h-5 mr-2" />
                        {isLoading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change PIN */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Change PIN</h2>
                        <p className="text-sm text-slate-500">Update your 4-digit security PIN</p>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleChangePIN} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Current PIN
                      </label>
                      <div className="relative max-w-xs">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type={showCurrentPIN ? 'text' : 'password'}
                          value={currentPIN}
                          onChange={(e) => setCurrentPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-lg tracking-widest"
                          placeholder="****"
                          maxLength={4}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPIN(!showCurrentPIN)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPIN ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          New PIN
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showNewPIN ? 'text' : 'password'}
                            value={newPIN}
                            onChange={(e) => setNewPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-lg tracking-widest"
                            placeholder="****"
                            maxLength={4}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPIN(!showNewPIN)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPIN ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Confirm New PIN
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="password"
                            value={confirmPIN}
                            onChange={(e) => setConfirmPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-lg tracking-widest"
                            placeholder="****"
                            maxLength={4}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-200 disabled:opacity-50"
                      >
                        <Shield className="w-5 h-5 mr-2" />
                        {isLoading ? 'Changing...' : 'Change PIN'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
                  <p className="text-sm text-slate-500">Manage how you receive notifications</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { title: 'Document Shared', desc: 'When someone shares a document with you', enabled: true },
                    { title: 'Access Requests', desc: 'When someone requests access to your document', enabled: true },
                    { title: 'Security Alerts', desc: 'Important security notifications', enabled: true },
                    { title: 'Weekly Reports', desc: 'Weekly summary of document activity', enabled: false },
                    { title: 'Marketing Updates', desc: 'Product updates and news', enabled: false },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={item.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-lg font-semibold text-slate-900">Appearance Settings</h2>
                  <p className="text-sm text-slate-500">Customize how SecureView looks</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'light', name: 'Light', bg: 'bg-white', text: 'text-slate-900' },
                        { id: 'dark', name: 'Dark', bg: 'bg-slate-900', text: 'text-white' },
                        { id: 'system', name: 'System', bg: 'bg-gradient-to-r from-white to-slate-900', text: 'text-slate-600' },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          className={cn(
                            'p-4 rounded-xl border-2 transition-all',
                            theme.id === 'light' ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'
                          )}
                        >
                          <div className={cn('w-full h-16 rounded-lg mb-3', theme.bg)} />
                          <p className="text-sm font-medium text-slate-900">{theme.name}</p>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Dark mode coming soon</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Accent Color
                    </label>
                    <div className="flex space-x-3">
                      {['emerald', 'blue', 'purple', 'rose', 'amber'].map((color) => (
                        <button
                          key={color}
                          className={cn(
                            'w-10 h-10 rounded-full ring-2 ring-offset-2 transition-all',
                            color === 'emerald' && 'bg-emerald-500 ring-emerald-500',
                            color === 'blue' && 'bg-blue-500 ring-transparent hover:ring-blue-500',
                            color === 'purple' && 'bg-purple-500 ring-transparent hover:ring-purple-500',
                            color === 'rose' && 'bg-rose-500 ring-transparent hover:ring-rose-500',
                            color === 'amber' && 'bg-amber-500 ring-transparent hover:ring-amber-500'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
