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
app.use('/api/contractors', contractorRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
