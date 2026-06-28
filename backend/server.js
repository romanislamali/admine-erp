const express = require('express');
const cors = require('cors');
require('dotenv').config();

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

app.use('/api/contractors', contractorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

