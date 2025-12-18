# SecureView - Secure Document Viewing Platform

A comprehensive, security-focused document management and viewing platform built with Go (Gin + GORM) backend and React (TypeScript) frontend.

## Overview

SecureView is designed for organizations that need to share sensitive documents while maintaining strict control over who can view them and tracking all access. It features:

- **Multi-tenant Architecture**: Each organization has isolated data
- **Role-based Access Control**: Super Admin, Org Admin, Manager, Member, Viewer
- **Secure Document Viewer**: Watermarked viewing with security protections
- **Comprehensive Audit Logging**: Track every document access
- **Two-Factor Authentication**: Password + PIN verification

## Features

### For Organizations
- Self-service registration with admin account
- Invite team members with specific roles
- Create groups for bulk access management
- Organization-wide activity monitoring

### For Users
- Upload documents (PDF, Office, images)
- Share with individuals, groups, or roles
- Set expiry dates and one-time access
- View detailed access logs

### Security Features
- JWT-based authentication with refresh tokens
- PIN verification for sensitive operations
- Dynamic watermarks with viewer identification
- Disabled right-click, print, and screenshot shortcuts
- Tab-switch blur protection
- DevTools detection
- Session tracking and heartbeat
- IP geolocation logging

## Tech Stack

### Backend
- **Go 1.21+** - High-performance server
- **Gin** - Web framework
- **GORM** - ORM for PostgreSQL
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **Lucide** - Icons

### Database
- **PostgreSQL** - Primary database
- **Redis** (optional) - Session caching

## Project Structure

```
secureview/
├── backend/
│   ├── cmd/api/           # Application entry point
│   ├── internal/
│   │   ├── config/        # Configuration management
│   │   ├── database/      # Database connection & migrations
│   │   ├── handlers/      # HTTP request handlers
│   │   ├── middleware/    # Auth, CORS, rate limiting
│   │   ├── models/        # GORM database models
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities (JWT, hashing, etc.)
│   ├── api/               # Route definitions
│   ├── go.mod
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/           # API client modules
│   │   ├── components/    # React components
│   │   │   ├── common/    # Reusable UI components
│   │   │   ├── layout/    # Layout components
│   │   │   └── viewer/    # Secure document viewer
│   │   ├── context/       # React contexts
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript interfaces
│   │   └── utils/         # Utility functions
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Getting Started

### Prerequisites
- Go 1.21 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- (Optional) Redis for caching

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Install dependencies:
```bash
go mod download
```

4. Create the database:
```bash
createdb secureview
```

5. Run the server:
```bash
go run cmd/api/main.go
```

The API will be available at `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy and configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API URL
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register organization |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/verify-pin` | Verify PIN |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| GET | `/api/v1/auth/me` | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/documents` | List documents |
| POST | `/api/v1/documents` | Upload document |
| GET | `/api/v1/documents/:id` | Get document |
| PUT | `/api/v1/documents/:id` | Update document |
| DELETE | `/api/v1/documents/:id` | Delete document |
| GET | `/api/v1/documents/:id/access` | Get access list |
| POST | `/api/v1/documents/:id/access` | Grant access |
| DELETE | `/api/v1/documents/:id/access/:aid` | Revoke access |
| GET | `/api/v1/documents/:id/logs` | Get audit logs |

### Document Viewer
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/viewer/:id/init` | Initialize session |
| GET | `/api/v1/viewer/:id/page/:num` | Get page |
| POST | `/api/v1/viewer/:id/heartbeat` | Keep alive |
| POST | `/api/v1/viewer/:id/close` | End session |
| POST | `/api/v1/viewer/:id/security-event` | Report event |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users |
| GET | `/api/v1/users/:id` | Get user |
| PUT | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Deactivate user |
| POST | `/api/v1/invitations` | Create invitation |
| GET | `/api/v1/invitations` | List invitations |
| DELETE | `/api/v1/invitations/:id` | Cancel invitation |

## Database Schema

### Core Tables
- **organizations** - Tenant organizations
- **users** - User accounts
- **sessions** - Active sessions
- **invitations** - User invitations

### Document Tables
- **documents** - Uploaded documents
- **document_access** - Access permissions
- **access_requests** - Access requests
- **viewing_sessions** - Active viewing sessions

### Supporting Tables
- **groups** - User groups
- **group_members** - Group membership
- **audit_logs** - Activity logs
- **notifications** - In-app notifications

## Security Considerations

### What's Protected
- Right-click context menu
- Ctrl+S, Ctrl+P, Ctrl+C shortcuts
- F12 developer tools
- PrintScreen key
- Text selection
- Drag and drop

### What's Logged
- Document opens/closes
- Duration of viewing
- Pages viewed
- IP address and location
- Browser and device info
- Security event attempts

### What's Not Prevented
- Phone camera photos (but watermark is traceable)
- Screen recording (watermark visible)
- Determined technical attacks (but logged)

## User Roles

| Role | Upload | Share | View | Manage Users | Manage Org |
|------|--------|-------|------|--------------|------------|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Org Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | - | - |
| Member | ✓ | ✓ | ✓ | - | - |
| Viewer | - | - | ✓ | - | - |

## Environment Variables

### Backend
```env
PORT=8080
ENVIRONMENT=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=secureview
JWT_SECRET=your-secret-key
```

### Frontend
```env
VITE_API_URL=http://localhost:8080/api/v1
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For support, please open an issue in the repository.
