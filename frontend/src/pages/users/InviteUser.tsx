import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Mail,
  ArrowLeft,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Send,
  Users,
  Shield
} from 'lucide-react';
import { usersApi } from '../../api/users';
import type { Invitation, UserRole } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const InviteUser: React.FC = () => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('member');

  // Load existing invitations
  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    console.log('[InviteUser] Loading invitations...');
    try {
      const data = await usersApi.listInvitations();
      console.log('[InviteUser] Got invitations:', data);
      setInvitations(data || []);
    } catch (err) {
      console.error('[InviteUser] Failed to load invitations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviteLink(null);
    setIsSubmitting(true);

    console.log('[InviteUser] Creating invitation...', { email, name, role });

    try {
      const response = await usersApi.createInvitation({ email, name, role });
      console.log('[InviteUser] Invitation created:', response);

      // Generate the full invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/accept-invite?token=${response.invite_token || response.invitation?.token}`;
      setInviteLink(link);

      setSuccess(`Invitation sent to ${email}! An email has been sent with the registration link.`);
      setEmail('');
      setName('');
      setRole('member');
      loadInvitations();
    } catch (err: unknown) {
      console.error('[InviteUser] Failed to create invitation:', err);

      let errorMessage = 'Failed to send invitation';
      if (err && typeof err === 'object') {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleCancelInvitation = async (id: string) => {
    console.log('[InviteUser] Canceling invitation:', id);
    try {
      await usersApi.cancelInvitation(id);
      console.log('[InviteUser] Invitation canceled');
      loadInvitations();
    } catch (err) {
      console.error('[InviteUser] Failed to cancel invitation:', err);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full text-xs font-medium">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="flex items-center text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Accepted
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center text-red-700 bg-red-100 px-3 py-1.5 rounded-full text-xs font-medium">
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'org_admin':
        return 'bg-purple-100 text-purple-700';
      case 'manager':
        return 'bg-blue-100 text-blue-700';
      case 'member':
        return 'bg-green-100 text-green-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/users')}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl transition-colors shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-bold text-slate-900">Invite Team Member</h1>
            </div>
            <p className="text-slate-500 mt-1">
              Send invitations to add new users to your organization
            </p>
          </div>
        </div>

        {/* Invite Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
            <div className="flex items-center space-x-2 text-white">
              <Send className="w-5 h-5" />
              <h2 className="text-lg font-semibold">New Invitation</h2>
            </div>
            <p className="text-emerald-100 text-sm mt-1">
              The user will receive an email with a registration link
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-3">
                <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-start space-x-3 text-emerald-700">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Success!</p>
                    <p className="text-sm">{success}</p>
                  </div>
                </div>

                {inviteLink && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-emerald-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Invitation Link (you can also share this manually):
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`p-2.5 rounded-lg transition-all ${
                          copied
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={copied ? 'Copied!' : 'Copy link'}
                      >
                        {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                      <a
                        href={inviteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Open link"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'viewer', label: 'Viewer', desc: 'View only' },
                    { value: 'member', label: 'Member', desc: 'Upload & share' },
                    { value: 'manager', label: 'Manager', desc: 'Manage docs & users' },
                    { value: 'org_admin', label: 'Admin', desc: 'Full access' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value as UserRole)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        role === option.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className={`font-medium ${role === option.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {option.label}
                      </p>
                      <p className={`text-xs mt-1 ${role === option.value ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-200 transition-all"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Pending Invitations</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-slate-500 mt-4">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No pending invitations</p>
              <p className="text-slate-500 text-sm mt-1">Invite someone to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{invitation.email}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRoleColor(invitation.role)}`}>
                            {formatRole(invitation.role)}
                          </span>
                          <span className="text-sm text-slate-500">
                            Sent {formatDate(invitation.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(invitation.status)}
                      {invitation.status === 'pending' && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Cancel invitation"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Secure Invitations</p>
              <p className="text-sm text-blue-700 mt-1">
                Invitation links are unique and expire after 72 hours. The invited user will need to create an account with a password and PIN to access SecureView.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteUser;
