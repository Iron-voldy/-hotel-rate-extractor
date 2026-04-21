import axios from 'axios'
import Busboy from 'busboy'
import path from 'path'
import XLSX from 'xlsx'

const N8N_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract-malasia'
const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls'])

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    const files = {}
    const fields = {}

    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info
      const chunks = []

      file.on('data', (chunk) => chunks.push(chunk))
      file.on('end', () => {
        files[fieldname] = {
          data: Buffer.concat(chunks),
          filename,
          encoding,
          mimetype: mimeType
        }
      })
    })

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value
    })

    busboy.on('finish', () => resolve({ files, fields }))
    busboy.on('error', reject)

    req.pipe(busboy)
  })
}

const isAllowedMalaysiaExcelFile = (filename = '') =>
  ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false,
    cellDates: false
  })

  const sheets = workbook.SheetNames.map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false
    })

    const columnCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)

    return {
      name: sheetName,
      rowCount: rows.length,
      columnCount,
      rows
    }
  })

  return {
    sheetCount: sheets.length,
    sheetNames: workbook.SheetNames,
    sheets
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Received Malaysia Excel extraction request')

    const { files } = await parseMultipart(req)
    const file = files.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!isAllowedMalaysiaExcelFile(file.filename)) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx or .xls) are allowed for Malaysia uploads' })
    }

    console.log('Malaysia file received:', file.filename, file.data.length, 'bytes')
    const parsedWorkbook = parseWorkbook(file.data)

    const response = await axios.post(
      N8N_WEBHOOK_URL,
      {
        file: file.data.toString('base64'),
        filename: file.filename,
        mimetype: file.mimetype,
        parsedWorkbook
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('Malaysia n8n response status:', response.status)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="malaysia_hotel_rates.xlsx"')

    res.send(Buffer.from(response.data))
  } catch (error) {
    console.error('Error calling Malaysia n8n webhook:', error.message)

    if (error.response) {
      console.error('Malaysia n8n error response:', error.response.status)
      res.status(error.response.status).json({
        error: 'n8n webhook error',
        details: error.response.data?.toString() || error.message
      })
      return
    }

    res.status(500).json({ error: 'Failed to connect to n8n', details: error.message })
  }
}

export const config = {
  api: {
    bodyParser: false
  }
}
