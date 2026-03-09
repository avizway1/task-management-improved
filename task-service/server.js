const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
require('dotenv').config();

const taskRoutes = require('./routes/tasks');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3002;

// Health check endpoint (before rate limiting for K8s probes)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'task-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (skip health endpoint)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: (req) => req.path === '/health'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
sequelize.authenticate()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return sequelize.sync({ alter: true });
  })
  .then(() => console.log('Database synchronized'))
  .catch(err => console.error('Database connection error:', err));

// Routes
app.use('/api/tasks', authMiddleware, taskRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Task service running on port ${PORT}`);
});