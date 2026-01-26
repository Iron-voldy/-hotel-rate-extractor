const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');

const app = express();
const PORT = 3001;
const N8N_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Enable CORS for all origins
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoint for text input
app.post('/api/extract-text', async (req, res) => {
  try {
    console.log('Received text extraction request');
    console.log('Request body:', req.body);

    const response = await axios.post(N8N_WEBHOOK_URL, {
      chatInput: req.body.chatInput
    }, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('n8n response status:', response.status);
    console.log('n8n response headers:', response.headers);

    // Set response headers for Excel file
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="hotel_rates.xlsx"'
    });

    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error calling n8n webhook:', error.message);
    if (error.response) {
      console.error('n8n error response:', error.response.status, error.response.data);
      res.status(error.response.status).json({ 
        error: 'n8n webhook error', 
        details: error.response.data?.toString() || error.message 
      });
    } else {
      res.status(500).json({ error: 'Failed to connect to n8n', details: error.message });
    }
  }
});

// Proxy endpoint for PDF upload
app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
  try {
    console.log('Received PDF extraction request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, req.file.size, 'bytes');

    // Convert file to base64
    const base64 = req.file.buffer.toString('base64');

    const response = await axios.post(N8N_WEBHOOK_URL, {
      file: base64,
      filename: req.file.originalname,
      mimetype: req.file.mimetype
    }, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('n8n response status:', response.status);

    // Set response headers for Excel file
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="hotel_rates.xlsx"'
    });

    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error calling n8n webhook:', error.message);
    if (error.response) {
      console.error('n8n error response:', error.response.status);
      res.status(error.response.status).json({ 
        error: 'n8n webhook error', 
        details: error.message 
      });
    } else {
      res.status(500).json({ error: 'Failed to connect to n8n', details: error.message });
    }
  }
});

// Handle all other routes - serve React app
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://192.16.26.51:${PORT}`);
  console.log(`\n📡 Proxying requests to: ${N8N_WEBHOOK_URL}\n`);
});
