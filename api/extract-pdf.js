import axios from 'axios';
import Busboy from 'busboy';

const N8N_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract';

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const files = {};
    const fields = {};

    // In newer Busboy versions, the 3rd param is an object: { filename, encoding, mimeType }
    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => {
        files[fieldname] = {
          data: Buffer.concat(chunks),
          filename: filename,
          encoding: encoding,
          mimetype: mimeType
        };
      });
    });

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('finish', () => resolve({ files, fields }));
    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received PDF extraction request');

    const { files } = await parseMultipart(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', file.filename, file.data.length, 'bytes');

    // Convert file to base64 and send as JSON (avoids multipart issues)
    const base64 = file.data.toString('base64');

    const response = await axios.post(N8N_WEBHOOK_URL, {
      file: base64,
      filename: file.filename,
      mimetype: file.mimetype
    }, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('n8n response status:', response.status);

    // Set response headers for Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="hotel_rates.xlsx"');

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
}

export const config = {
  api: {
    bodyParser: false,
  },
};
