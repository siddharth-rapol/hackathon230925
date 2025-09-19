const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB (replace with your connection string)
mongoose.connect('YOUR_MONGODB_CONNECTION_STRING', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Snippet Schema
const snippetSchema = new mongoose.Schema({
  shareCode: { type: String, unique: true },
  title: String,
  code: String,
  language: String,
  timestamp: Date,
  expiresAt: Date,
});

const Snippet = mongoose.model('Snippet', snippetSchema);

// Helper to generate unique 4-digit code
function generateShareCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Save snippet endpoint
app.post('/snippets', async (req, res) => {
  try {
    let shareCode;
    let exists;
    // Ensure unique shareCode
    do {
      shareCode = generateShareCode();
      exists = await Snippet.findOne({ shareCode });
    } while (exists);

    const data = {
      ...req.body,
      shareCode,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    const snippet = new Snippet(data);
    await snippet.save();

    res.json({ shareCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error saving snippet' });
  }
});

// Retrieve snippet endpoint
app.get('/snippets/:code', async (req, res) => {
  try {
    const snippet = await Snippet.findOne({ shareCode: req.params.code });
    if (!snippet || snippet.expiresAt < new Date()) {
      return res.status(404).json({ error: 'Snippet not found or expired' });
    }
    res.json(snippet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching snippet' });
  }
});

// Background cleanup (optional) - removes expired snippets every hour
setInterval(async () => {
  try {
    await Snippet.deleteMany({ expiresAt: { $lt: new Date() } });
    console.log('Cleaned expired snippets');
  } catch (e) {
    console.error('Cleanup error', e);
  }
}, 3600000);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
