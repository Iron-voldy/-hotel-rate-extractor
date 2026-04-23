const express = require('express')
const cors = require('cors')
const axios = require('axios')
const multer = require('multer')
const path = require('path')
const XLSX = require('xlsx')

const app = express()
const PORT = 3001
const DEFAULT_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract'
const VIETNAM_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract-vn'
const VIETNAM_CRUISE_WEBHOOK_URL = 'https://aahaas-ai.app.n8n.cloud/webhook/hotel-rate-extract-vn-cruise'

const storage = multer.memoryStorage()
const upload = multer({ storage })

const allowedVietnamExtensions = new Set(['.xlsx', '.xls'])

const sendExcelResponse = (res, responseBuffer, filename = 'hotel_rates.xlsx') => {
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`
  })

  res.send(Buffer.from(responseBuffer))
}

const handleProxyError = (res, error) => {
  console.error('Error calling n8n webhook:', error.message)

  if (error.response) {
    console.error('n8n error response:', error.response.status)
    res.status(error.response.status).json({
      error: 'n8n webhook error',
      details: error.response.data?.toString() || error.message
    })
    return
  }

  res.status(500).json({ error: 'Failed to connect to n8n', details: error.message })
}

const getFileExtension = (filename = '') => path.extname(filename).toLowerCase()

const isVietnamExcelFile = (file) => allowedVietnamExtensions.has(getFileExtension(file.originalname))

const parseWorkbook = (buffer) => {
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

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

app.post('/api/extract-text', async (req, res) => {
  try {
    console.log('Received text extraction request')

    const response = await axios.post(
      DEFAULT_WEBHOOK_URL,
      { chatInput: req.body.chatInput },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('n8n response status:', response.status)
    sendExcelResponse(res, response.data)
  } catch (error) {
    handleProxyError(res, error)
  }
})

app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
  try {
    console.log('Received PDF extraction request')

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    console.log('File received:', req.file.originalname, req.file.size, 'bytes')

    const response = await axios.post(
      DEFAULT_WEBHOOK_URL,
      {
        file: req.file.buffer.toString('base64'),
        filename: req.file.originalname,
        mimetype: req.file.mimetype
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('n8n response status:', response.status)
    sendExcelResponse(res, response.data)
  } catch (error) {
    handleProxyError(res, error)
  }
})

app.post('/api/extract-vietnam-excel', upload.single('file'), async (req, res) => {
  try {
    console.log('Received Vietnam Excel extraction request')

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!isVietnamExcelFile(req.file)) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx or .xls) are allowed for Vietnam uploads' })
    }

    console.log('Vietnam file received:', req.file.originalname, req.file.size, 'bytes')
    const parsedWorkbook = parseWorkbook(req.file.buffer)

    const response = await axios.post(
      VIETNAM_WEBHOOK_URL,
      {
        file: req.file.buffer.toString('base64'),
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        parsedWorkbook
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('Vietnam n8n response status:', response.status)
    sendExcelResponse(res, response.data, 'vietnam_hotel_rates.xlsx')
  } catch (error) {
    handleProxyError(res, error)
  }
})

app.post('/api/extract-vietnam-cruise-excel', upload.single('file'), async (req, res) => {
  try {
    console.log('Received Vietnam cruise Excel extraction request')

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!isVietnamExcelFile(req.file)) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx or .xls) are allowed for Vietnam cruise uploads' })
    }

    console.log('Vietnam cruise file received:', req.file.originalname, req.file.size, 'bytes')
    const parsedWorkbook = parseWorkbook(req.file.buffer)

    const response = await axios.post(
      VIETNAM_CRUISE_WEBHOOK_URL,
      {
        file: req.file.buffer.toString('base64'),
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        parsedWorkbook
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('Vietnam cruise n8n response status:', response.status)
    sendExcelResponse(res, response.data, 'vietnam_cruise_rates.xlsx')
  } catch (error) {
    handleProxyError(res, error)
  }
})

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log('\nServer running at:')
  console.log(`   Local:   http://localhost:${PORT}`)
  console.log(`   Network: http://192.16.26.51:${PORT}`)
  console.log(`\nDefault webhook: ${DEFAULT_WEBHOOK_URL}`)
  console.log(`Vietnam webhook: ${VIETNAM_WEBHOOK_URL}\n`)
  console.log(`Vietnam cruise webhook: ${VIETNAM_CRUISE_WEBHOOK_URL}\n`)
})
