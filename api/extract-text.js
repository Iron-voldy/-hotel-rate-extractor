import axios from 'axios';

const N8N_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract';

export default async function handler(req, res) {
  try {
    console.log('Received text extraction request');
    console.log('Request body:', req.body);

    // Simple proxy to n8n webhook - just like the original Express server
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
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="hotel_rates.xlsx"');

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
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
