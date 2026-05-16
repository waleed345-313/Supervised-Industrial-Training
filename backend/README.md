# SIT Project Backend

Backend API for the Student Internship Tracking (SIT) system built with Node.js, Express, and MongoDB.

## Setup Instructions

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up **local MongoDB** (same URI for the app and [MongoDB Compass](https://www.mongodb.com/products/compass)):
   - Install and start [MongoDB Community Server](https://www.mongodb.com/try/download/community) so it listens on `localhost:27017`
   - In `backend/.env`, set `MONGODB_URI=mongodb://localhost:27017/test` (or another database name in the path)
   - In Compass: **New connection** → paste that URI → Connect

4. Update the `.env` file with your MongoDB connection string and JWT secret.

5. Start the server:
   ```bash
   npm run dev  # For development with nodemon
   # or
   npm start    # For production
   ```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Companies
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Internships
- `GET /api/internships` - Get all internships
- `GET /api/internships/:id` - Get internship by ID
- `POST /api/internships` - Create internship
- `PUT /api/internships/:id` - Update internship
- `DELETE /api/internships/:id` - Delete internship

### Applications
- `GET /api/applications` - Get all applications
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Create application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Progress Reports
- `GET /api/progress-reports` - Get all progress reports
- `GET /api/progress-reports/:id` - Get progress report by ID
- `POST /api/progress-reports` - Create progress report
- `PUT /api/progress-reports/:id` - Update progress report
- `DELETE /api/progress-reports/:id` - Delete progress report

### Evaluations
- `GET /api/evaluations` - Get all evaluations
- `GET /api/evaluations/:id` - Get evaluation by ID
- `POST /api/evaluations` - Create evaluation
- `PUT /api/evaluations/:id` - Update evaluation
- `DELETE /api/evaluations/:id` - Delete evaluation

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/:id` - Get notification by ID
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id` - Update notification
- `DELETE /api/notifications/:id` - Delete notification

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get document by ID
- `POST /api/documents` - Create document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

## Database Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database named `sit-project`
4. Create collections for each model (users, students, companies, etc.)
5. Update the connection string in `.env`

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- bcryptjs for password hashing
- jsonwebtoken for authentication
- express-validator for input validation
- cors for cross-origin requests