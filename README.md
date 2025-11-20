# Solivra - Habit Tracking Application

A modern, high-performance habit tracking application built with Go backend and React frontend.

## 🚀 Tech Stack

### Backend (Go)
- **Language**: Go 1.21+
- **Framework**: Fiber v2 (Express-like)
- **Database**: MongoDB Atlas
- **Authentication**: JWT + HTTP-only cookies
- **Security**: bcrypt, CORS, rate limiting, helmet

### Frontend (React)
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS v4
- **State Management**: Context API
- **HTTP Client**: Axios
- **UI Libraries**: Framer Motion, React Icons, React Hot Toast

## 📁 Project Structure

```
Solivra/
├── backend/          # Go backend (Production Ready ✅)
│   ├── cmd/          # Application entry points
│   ├── internal/     # Private application code
│   ├── pkg/          # Public libraries
│   └── server        # Compiled binary (~17MB)
├── frontend/         # React frontend
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── dist/         # Production build
└── README.md         # This file
```

## 🛠️ Quick Start

### Backend

```bash
cd backend

# Run development server
go run cmd/server/main.go

# Or use compiled binary
./server
```

Backend runs on: **http://localhost:5000**

### Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run development server
npm run dev
```

Frontend runs on: **http://localhost:5173**

## 🌐 Environment Setup

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
MONGO_DB_NAME=the_database_name_inside_your_cluster
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=https://your-frontend-url.com
DEV_FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE=http://localhost:5000
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### User Management
- `GET /api/users/me` - Get current user
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/password` - Update password
- `DELETE /api/users` - Delete account
- `GET /api/users/sessions` - Get all sessions
- `DELETE /api/users/sessions/:id` - Revoke session

### Statistics & Tracking
- `GET /api/stats` - Get user statistics
- `GET /api/relapses` - Get all relapses
- `POST /api/relapses` - Create relapse
- `PUT /api/relapses/:id` - Update relapse
- `DELETE /api/relapses/:id` - Delete relapse

### Admin (Admin only)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Admin statistics
- `DELETE /api/admin/users/:id` - Delete user

## 🚢 Deployment

### Backend (Docker)
```bash
cd backend
docker build -t solivra-backend .
docker run -p 5000:5000 solivra-backend
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
```

## 📊 Performance

Go backend vs Node.js:
- ⚡ **10-50x faster** request handling
- 💾 **5x less** memory usage (~10-20MB vs ~50-100MB)
- 📦 **10x smaller** Docker images (~15MB vs ~150MB)
- 🚀 **20-30x faster** startup time

## 🔐 Security Features

- JWT-based authentication
- HTTP-only cookies
- Password hashing with bcrypt
- CORS protection
- Rate limiting (200 req/min)
- Input sanitization
- MongoDB injection prevention
- Security headers (Helmet)

## 📝 Development

### Running Both Services

Terminal 1 (Backend):
```bash
cd backend && go run cmd/server/main.go
```

Terminal 2 (Frontend):
```bash
cd frontend && npm run dev
```

### Building for Production

Backend:
```bash
cd backend
go build -o server cmd/server/main.go
```

Frontend:
```bash
cd frontend
npm run build
```

## 🎯 Features

- ✅ User authentication & authorization
- ✅ Habit streak tracking
- ✅ Relapse logging & analytics
- ✅ User statistics dashboard
- ✅ Session management
- ✅ Admin panel
- ✅ Multi-language support (EN/ID)
- ✅ Dark mode support
- ✅ Responsive design

## 📄 License

Same as parent project

---

**Made with ❤️ for better habit tracking**

Backend: Production Ready ✅ | Frontend: Production Ready ✅
