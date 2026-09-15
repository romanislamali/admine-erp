const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const logger = require('./utils/logger');

// For Google Drive DB Backup
require('./backupScheduler.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Uploaded/optimized CMS images (client logos, project thumbnails).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log every request once it finishes, with the status code and how long it took.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Import routes
const contractorRoutes = require('./routes/contractorRoutes');
const projectRoutes = require('./routes/projectRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const clientRoutes = require('./routes/clientRoutes');
const clientPORoutes = require('./routes/clientPORoutes');
const clientBillRoutes = require('./routes/clientBillRoutes');
const clientBillScheduleRoutes = require('./routes/clientBillScheduleRoutes');
const clientPaymentRoutes = require('./routes/clientPaymentRoutes');
const userRoutes = require('./routes/userRoutes');
const cmsClientRoutes = require('./routes/cmsClientRoutes');
const cmsProjectRoutes = require('./routes/cmsProjectRoutes');
const { authenticateToken } = require('./middlewares/auth');

app.use('/api/contractors', authenticateToken, contractorRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/bills', authenticateToken, billRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/clients', authenticateToken, clientRoutes);
app.use('/api/client-pos', authenticateToken, clientPORoutes);
app.use('/api/client-bills', authenticateToken, clientBillRoutes);
app.use('/api/client-bill-schedules', authenticateToken, clientBillScheduleRoutes);
app.use('/api/client-payments', authenticateToken, clientPaymentRoutes);
app.use('/api/users', userRoutes);

// Website CMS: each router mixes public (unauthenticated) read routes with
// admin-only write routes internally, same pattern as userRoutes' /login, so
// no blanket authenticateToken wraps the mount here.
app.use('/api/cms/clients', cmsClientRoutes);
app.use('/api/cms/projects', cmsProjectRoutes);

// Catch-all: anything that reaches here escaped a route's own try/catch
// (e.g. malformed JSON body, a thrown error outside an async handler).
app.use((err, req, res, next) => {
  // Multer's own errors (file too large, etc.) and our fileFilter's
  // rejection (unsupported type) are request/validation problems, not
  // server faults — surface them as 400s instead of a generic 500.
  if (err instanceof multer.MulterError || (err && /Unsupported file type/.test(err.message))) {
    return res.status(400).json({ message: err.message });
  }
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

