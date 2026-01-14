import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout
import MainLayout from './components/layout/MainLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyPIN from './pages/auth/VerifyPIN';
import AcceptInvitation from './pages/auth/AcceptInvitation';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// Documents
import DocumentList from './pages/documents/DocumentList';
import DocumentUpload from './pages/documents/DocumentUpload';

// Users
import UserList from './pages/users/UserList';
import InviteUser from './pages/users/InviteUser';

// Activity
import ActivityLogs from './pages/activity/ActivityLogs';

// Settings
import Settings from './pages/settings/Settings';

// Help
import Help from './pages/help/Help';

// Viewer
import SecureViewer from './components/viewer/SecureViewer';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-pin" element={<VerifyPIN />} />
          <Route path="/accept-invite" element={<AcceptInvitation />} />

          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<DocumentList mode="my" />} />
            <Route path="/documents/upload" element={<DocumentUpload />} />
            <Route path="/shared" element={<DocumentList mode="shared" />} />
            <Route path="/documents/all" element={<DocumentList mode="all" />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/invitations" element={<InviteUser />} />
            <Route path="/users/invite" element={<InviteUser />} />
            <Route path="/activity" element={<ActivityLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/profile" element={<Settings />} />
            <Route path="/settings/security" element={<Settings />} />
            <Route path="/settings/notifications" element={<Settings />} />
            <Route path="/settings/appearance" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Route>

          {/* Secure viewer (full screen, outside layout) */}
          <Route path="/viewer/:id" element={<SecureViewer />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
