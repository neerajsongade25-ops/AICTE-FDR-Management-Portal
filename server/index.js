require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const seedDatabase = require('./seed');
const { startMaturityCron, runMaturityCheck } = require('./cron/maturityTracker');
const { auth } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/fdr', require('./routes/fdr'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/bulk-import', require('./routes/bulkImport'));
app.use('/api', require('./routes/misc'));

// Manual seed endpoint
app.post('/api/seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual maturity check trigger (for demo)
app.post('/api/run-maturity-check', auth, async (req, res) => {
  try {
    const results = await runMaturityCheck();
    res.json({ message: 'Maturity check completed', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'development' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aicte_fdr_portal';

async function startServer() {
  let mongoUri = MONGODB_URI;
  
  try {
    // Try connecting to the configured MongoDB URI first
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ Connected to MongoDB:', mongoUri.includes('localhost') ? 'localhost' : 'remote');
  } catch (err) {
    console.log('⚠️  Could not connect to MongoDB at', mongoUri);
    console.log('🔄 Starting in-memory MongoDB (mongodb-memory-server)...');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
      console.error('Please install MongoDB or set MONGODB_URI to a valid connection string.');
      process.exit(1);
    }
  }

  // Auto-seed if database is empty
  await seedDatabase();

  // Start maturity tracking cron
  startMaturityCron();

  app.listen(PORT, () => {
    console.log(`🚀 AICTE FDR Portal API running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Demo: institution@demo.com / scrutiny@demo.com / bank@demo.com / director@demo.com (password: demo123)`);
  });
}

startServer();
