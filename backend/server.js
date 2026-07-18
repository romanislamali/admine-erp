const express = require('express');
const cors = require('cors');
require('dotenv').config();

// For Google Drive DB Backup
require('./backupScheduler.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Import routes
const contractorRoutes = require('./routes/contractorRoutes');
const projectRoutes = require('./routes/projectRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const { authenticateToken } = require('./middlewares/auth');

app.use('/api/contractors', authenticateToken, contractorRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/bills', authenticateToken, billRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

