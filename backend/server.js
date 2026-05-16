const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('./models/User');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Local MongoDB — same URI in .env as in MongoDB Compass (mongodb://localhost:27017/...).
const mongoUri =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/test';
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected (local)'))
  .catch((err) => console.error('MongoDB connection failed:', err.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/internships', require('./routes/internships'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/progress-reports', require('./routes/progressReports'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/supervisor', require('./routes/supervisor'));
app.use('/api/panel', require('./routes/panel'));
app.use('/api/focal/announcements', require('./routes/focalAnnouncements'));
app.use('/api/focal', require('./routes/focalFinalGrading'));
app.use('/api/company-feedback', require('./routes/companyFeedback'));
app.use('/api/placements/replacement', require('./routes/replacements'));

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) return next(new Error('No token, authorization denied'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.data.userId = decoded.user.id;
    return next();
  } catch (err) {
    return next(new Error('Token is not valid'));
  }
});

io.on('connection', async (socket) => {
  if (!socket.data.userId) return;
  socket.join(String(socket.data.userId));
  try {
    const u = await User.findById(socket.data.userId).select('companyId role');
    if (u?.companyId) socket.join(`company:${u.companyId}`);
    if (u?.role === 'manager_placements') socket.join('placements');
  } catch (e) {
    /* ignore */
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port or set PORT env var to another value.`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});