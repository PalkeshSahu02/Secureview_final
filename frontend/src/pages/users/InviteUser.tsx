import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, ArrowLeft, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
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
    setIsSubmitting(true);

    console.log('[InviteUser] Creating invitation...', { email, name, role });

    try {
      const invitation = await usersApi.createInvitation({ email, name, role });
      console.log('[InviteUser] Invitation created:', invitation);
      setSuccess(`Invitation sent to ${email}`);
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
          <span className="flex items-center text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full text-xs">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">
            <CheckCircle className="w-3 h-3 mr-1" /> Accepted
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs">
            <XCircle className="w-3 h-3 mr-1" /> Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Invite User</h1>
          <p className="text-secondary-600 mt-1">
            Send invitations to add new users to your organization
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">New Invitation</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              leftIcon={<Mail className="w-5 h-5" />}
            />

            <Input
              label="Name (optional)"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="viewer">Viewer - Can only view shared documents</option>
              <option value="member">Member - Can upload and share documents</option>
              <option value="manager">Manager - Can manage documents and users</option>
              <option value="org_admin">Admin - Full organization access</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting} leftIcon={<UserPlus className="w-4 h-4" />}>
              Send Invitation
            </Button>
          </div>
        </form>
      </div>

      {/* Pending Invitations */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h2 className="text-lg font-semibold text-secondary-900">Pending Invitations</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-secondary-500">Loading...</div>
        ) : invitations.length === 0 ? (
          <div className="p-6 text-center text-secondary-500">
            No pending invitations
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">{invitation.email}</p>
                    <p className="text-sm text-secondary-500">
                      {formatRole(invitation.role)} • Sent {formatDate(invitation.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(invitation.status)}
                  {invitation.status === 'pending' && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 text-secondary-400 hover:text-red-600 transition-colors"
                      title="Cancel invitation"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteUser;
