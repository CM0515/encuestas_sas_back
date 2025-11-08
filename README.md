# Survey SaaS - Backend API

Backend API built with NestJS for the Survey SaaS platform.

## 🚀 Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth + JWT
- **Cache**: Upstash Redis
- **Real-time**: Pusher
- **Email**: Resend
- **Deployment**: Vercel Serverless

## 📁 Project Structure

```
src/
├── auth/                 # Authentication module (JWT, Firebase)
├── surveys/              # Surveys CRUD operations
├── questions/            # Questions management
├── responses/            # Survey responses handling
├── analytics/            # Analytics and reporting
├── common/               # Shared utilities
│   ├── decorators/       # Custom decorators
│   ├── filters/          # Exception filters
│   ├── interceptors/     # Request/Response interceptors
│   └── pipes/            # Validation pipes
├── shared/               # Shared modules
│   ├── cache/            # Redis cache service
│   ├── email/            # Email service (Resend)
│   ├── firebase/         # Firebase integration
│   ├── realtime/         # Real-time service (Pusher)
│   └── storage/          # Firebase Storage
├── config/               # Configuration files
├── app.module.ts         # Root module
└── main.ts               # Application entry point
```

## 📦 Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables:

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Copy the credentials to your `.env` file

### Upstash Redis Setup
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and token to your `.env` file

### Pusher Setup
1. Go to [Pusher Dashboard](https://dashboard.pusher.com/)
2. Create a new Channels app
3. Copy the credentials to your `.env` file

### Resend Setup
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key
3. Copy the key to your `.env` file

## 🏃 Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3001/api`

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Firebase ID token
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/me` - Get current user

### Surveys
- `POST /api/surveys` - Create a new survey (Protected)
- `GET /api/surveys` - Get all user's surveys (Protected)
- `GET /api/surveys/:id` - Get survey by ID (Protected)
- `GET /api/surveys/:id/public` - Get public survey (Public)
- `PATCH /api/surveys/:id` - Update survey (Protected)
- `DELETE /api/surveys/:id` - Delete survey (Protected)

### Questions
- `POST /api/questions` - Create a new question (Protected)
- `GET /api/questions/survey/:surveyId` - Get all questions for a survey (Public)
- `GET /api/questions/:id` - Get question by ID (Protected)
- `PATCH /api/questions/:id` - Update question (Protected)
- `DELETE /api/questions/:id` - Delete question (Protected)

### Responses
- `POST /api/responses` - Submit a response (Public)
- `GET /api/responses/survey/:surveyId` - Get all responses for a survey (Protected)
- `GET /api/responses/:id` - Get response by ID (Protected)

### Analytics
- `GET /api/analytics/surveys/:surveyId/results` - Get survey results (Protected)
- `POST /api/analytics/surveys/:surveyId/export` - Export results to CSV (Protected)

## 🔒 Authentication

The API uses JWT tokens for authentication. Protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

To get a JWT token:
1. Authenticate with Firebase on the frontend
2. Send the Firebase ID token to `/api/auth/login`
3. Use the returned JWT for subsequent requests

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🚀 Deployment to Vercel

### Option 1: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Git Integration

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Import Project"
4. Select your repository
5. Configure environment variables
6. Deploy!

### Environment Variables on Vercel

Add all variables from `.env.example` to your Vercel project settings:

1. Go to Project Settings > Environment Variables
2. Add each variable from `.env.example`
3. Redeploy if necessary

## 📊 Firestore Collections

### surveys
```javascript
{
  title: string,
  description: string,
  createdBy: string,
  createdAt: Timestamp,
  isActive: boolean,
  responseCount: number,
  settings: {
    allowAnonymous: boolean,
    allowMultipleResponses: boolean,
    showResults: boolean,
    requireLogin: boolean,
    expiresAt: Timestamp | null
  }
}
```

### questions
```javascript
{
  surveyId: string,
  text: string,
  type: 'multiple_choice' | 'text' | 'scale' | 'date',
  options: string[], // For multiple_choice
  required: boolean,
  order: number,
  validation: {
    min: number,
    max: number,
    pattern: string
  }
}
```

### responses
```javascript
{
  surveyId: string,
  userId: string | null,
  answers: {
    [questionId: string]: any
  },
  submittedAt: Timestamp,
  metadata: {
    userAgent: string,
    ip: string
  }
}
```

### users
```javascript
{
  email: string,
  name: string,
  emailVerified: boolean,
  photoURL: string,
  role: 'user' | 'admin',
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

## 🔧 Troubleshooting

### Firebase Connection Issues
- Verify your service account credentials
- Check if Firestore is enabled in your project
- Ensure the private key is properly formatted (with \n for line breaks)

### Redis Connection Issues
- Verify Upstash credentials
- Check if your IP is whitelisted (if applicable)

### Deployment Issues on Vercel
- Make sure all environment variables are set
- Check the build logs for errors
- Verify that `vercel.json` is in the root directory

## 📚 Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Upstash Redis](https://docs.upstash.com/redis)
- [Pusher Channels](https://pusher.com/docs/channels)
- [Resend API](https://resend.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🆘 Support

For issues and questions, please open an issue on the GitHub repository.

---

Built with ❤️ using NestJS and Firebase
