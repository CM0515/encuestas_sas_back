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