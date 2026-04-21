import { useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = ''

const PDF_ACCEPTED_EXTENSIONS = new Set(['.pdf'])
const PDF_ACCEPTED_MIME_TYPES = new Set(['application/pdf'])
const EXCEL_ACCEPTED_EXTENSIONS = new Set(['.xlsx', '.xls'])
const EXCEL_ACCEPTED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream'
])

const TAB_CONTENT = {
  text: {
    navLabel: 'Contract Text',
    pageTitle: 'Contract Text Extraction',
    pageDescription: 'Extract and validate hotel rate data using AI-powered analysis',
    sectionTitle: 'Paste Contract Data',
    sectionDescription: 'Enter hotel contract text containing rate information for extraction',
    buttonLabel: 'Extract Rates & Download Excel',
    processingStatus: 'Analyzing contract data...',
    successStatus: 'Rate data extracted and downloaded successfully!'
  },
  pdf: {
    navLabel: 'PDF Upload',
    pageTitle: 'PDF Document Upload',
    pageDescription: 'Upload a contract PDF for automatic text extraction and rate analysis',
    sectionTitle: 'Upload PDF Document',
    sectionDescription: 'Upload a contract document for automatic text extraction and rate analysis',
    inputId: 'pdf-upload',
    accept: '.pdf,application/pdf',
    buttonLabel: 'Upload PDF & Download Excel',
    primaryPrompt: 'Drag and drop your PDF here',
    secondaryPrompt: 'or browse to select a file',
    restrictions: 'Supported: PDF - Max size: 10MB',
    readyMessage: 'Ready for processing',
    processingStatus: 'Extracting data from PDF...',
    successStatus: 'PDF processed and rate data downloaded!',
    endpoint: '/api/extract-pdf',
    invalidSelectMessage: 'Please select a valid PDF file',
    invalidDropMessage: 'Please drop a valid PDF file',
    missingFileMessage: 'Please select a PDF file',
    failureMessage: 'Failed to process PDF. Please try again.',
    fileTypeLabel: 'PDF'
  },
  vietnam: {
    navLabel: 'Vietnam Excel',
    pageTitle: 'Vietnam Excel Upload',
    pageDescription: 'Upload Vietnam hotel rate spreadsheets for AI-powered conversion and download',
    sectionTitle: 'Upload Vietnam Excel Sheet',
    sectionDescription: 'Upload only Vietnam Excel files to process them with the Vietnam-specific workflow',
    inputId: 'vietnam-upload',
    accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    buttonLabel: 'Upload Vietnam Excel & Download Result',
    primaryPrompt: 'Drag and drop your Vietnam Excel here',
    secondaryPrompt: 'or browse to select a file',
    restrictions: 'Supported: XLSX, XLS - Vietnam files only',
    readyMessage: 'Ready for Vietnam processing',
    processingStatus: 'Processing Vietnam Excel file...',
    successStatus: 'Vietnam Excel processed and downloaded successfully!',
    endpoint: '/api/extract-vietnam-excel',
    invalidSelectMessage: 'Please select a valid Excel file (.xlsx or .xls)',
    invalidDropMessage: 'Please drop a valid Excel file (.xlsx or .xls)',
    missingFileMessage: 'Please select a Vietnam Excel file',
    failureMessage: 'Failed to process the Vietnam Excel file. Please try again.',
    fileTypeLabel: 'XLS'
  },
  singapore: {
    navLabel: 'Singapore Excel',
    pageTitle: 'Singapore Excel Upload',
    pageDescription: 'Upload Singapore hotel rate spreadsheets for AI-powered conversion and download',
    sectionTitle: 'Upload Singapore Excel Sheet',
    sectionDescription: 'Upload Singapore Excel files to process them with the Singapore-specific workflow',
    inputId: 'singapore-upload',
    accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    buttonLabel: 'Upload Singapore Excel & Download Result',
    primaryPrompt: 'Drag and drop your Singapore Excel here',
    secondaryPrompt: 'or browse to select a file',
    restrictions: 'Supported: XLSX, XLS - Singapore files only',
    readyMessage: 'Ready for Singapore processing',
    processingStatus: 'Processing Singapore Excel file...',
    successStatus: 'Singapore Excel processed and downloaded successfully!',
    endpoint: '/api/extract-singapore-excel',
    downloadName: 'singapore_rate_data.xlsx',
    invalidSelectMessage: 'Please select a valid Excel file (.xlsx or .xls)',
    invalidDropMessage: 'Please drop a valid Excel file (.xlsx or .xls)',
    missingFileMessage: 'Please select a Singapore Excel file',
    failureMessage: 'Failed to process the Singapore Excel file. Please try again.',
    fileTypeLabel: 'XLS'
  },
  malaysia: {
    navLabel: 'Malaysia Excel',
    pageTitle: 'Malaysia Excel Upload',
    pageDescription: 'Upload Malaysia hotel rate spreadsheets for AI-powered conversion and download',
    sectionTitle: 'Upload Malaysia Excel Sheet',
    sectionDescription: 'Upload Malaysia Excel files to process them with the Malaysia-specific workflow',
    inputId: 'malaysia-upload',
    accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    buttonLabel: 'Upload Malaysia Excel & Download Result',
    primaryPrompt: 'Drag and drop your Malaysia Excel here',
    secondaryPrompt: 'or browse to select a file',
    restrictions: 'Supported: XLSX, XLS - Malaysia files only',
    readyMessage: 'Ready for Malaysia processing',
    processingStatus: 'Processing Malaysia Excel file...',
    successStatus: 'Malaysia Excel processed and downloaded successfully!',
    endpoint: '/api/extract-malaysia-excel',
    downloadName: 'malaysia_rate_data.xlsx',
    invalidSelectMessage: 'Please select a valid Excel file (.xlsx or .xls)',
    invalidDropMessage: 'Please drop a valid Excel file (.xlsx or .xls)',
    missingFileMessage: 'Please select a Malaysia Excel file',
    failureMessage: 'Failed to process the Malaysia Excel file. Please try again.',
    fileTypeLabel: 'XLS'
  }
}

const getFileExtension = (filename = '') => {
  const lastDot = filename.lastIndexOf('.')
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : ''
}

const isPdfFile = (file) =>
  PDF_ACCEPTED_MIME_TYPES.has(file.type) || PDF_ACCEPTED_EXTENSIONS.has(getFileExtension(file.name))

const isExcelFile = (file) =>
  EXCEL_ACCEPTED_MIME_TYPES.has(file.type) || EXCEL_ACCEPTED_EXTENSIONS.has(getFileExtension(file.name))

const isJsonBlob = (blob) => blob?.type?.includes('application/json')

const parseRequestError = async (err, fallbackMessage) => {
  if (err.response) {
    const errorText = err.response.data instanceof Blob
      ? await err.response.data.text()
      : typeof err.response.data === 'string'
        ? err.response.data
        : JSON.stringify(err.response.data)

    try {
      const errorObj = JSON.parse(errorText)
      return typeof errorObj.error === 'string'
        ? errorObj.error
        : errorObj.error?.message || errorObj.details || errorObj.message || `Server error: ${err.response.status}`
    } catch {
      return errorText || `Server error: ${err.response.status}`
    }
  }

  if (err.request) {
    return 'Cannot connect to server. Please check your connection.'
  }

  return err.message || fallbackMessage
}

function App() {
  const [activeTab, setActiveTab] = useState('text')
  const [contractText, setContractText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState({
    pdf: null,
    vietnam: null,
    singapore: null,
    malaysia: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const activeContent = TAB_CONTENT[activeTab]
  const activeUploadConfig = activeTab === 'pdf' || activeTab === 'vietnam' || activeTab === 'singapore' || activeTab === 'malaysia'
    ? TAB_CONTENT[activeTab]
    : null
  const currentSelectedFile = activeUploadConfig ? selectedFiles[activeTab] : null

  const resetFeedback = () => {
    setError('')
    setStatus('')
  }

  const clearText = () => {
    setContractText('')
    resetFeedback()
  }

  const clearFile = (fileKey) => {
    setSelectedFiles((previousFiles) => ({
      ...previousFiles,
      [fileKey]: null
    }))
    resetFeedback()
    setIsDragOver(false)

    const fileInput = document.getElementById(TAB_CONTENT[fileKey].inputId)
    if (fileInput) fileInput.value = ''
  }

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
    resetFeedback()
    setIsDragOver(false)
  }

  const downloadFile = (data, filename) => {
    const blob = new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleTextSubmit = async () => {
    if (!contractText.trim()) {
      setError('Please enter contract text')
      return
    }

    setIsLoading(true)
    setError('')
    setStatus(TAB_CONTENT.text.processingStatus)

    try {
      const response = await axios.post(
        `${API_BASE}/api/extract-text`,
        { chatInput: contractText },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (isJsonBlob(response.data)) {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        throw new Error(errorData.error || errorData.message || 'Server error')
      }

      downloadFile(response.data, 'rate_data.xlsx')
      setStatus(TAB_CONTENT.text.successStatus)
      setContractText('')
    } catch (err) {
      console.error('Error details:', err)
      setError(await parseRequestError(err, 'Failed to process contract. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (fileKey) => {
    const uploadConfig = TAB_CONTENT[fileKey]
    const file = selectedFiles[fileKey]

    if (!file) {
      setError(uploadConfig.missingFileMessage)
      return
    }

    setIsLoading(true)
    setError('')
    setStatus(uploadConfig.processingStatus)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_BASE}${uploadConfig.endpoint}`, formData, {
        responseType: 'blob'
      })

      if (isJsonBlob(response.data)) {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        throw new Error(errorData.error || errorData.message || 'Server error')
      }

      downloadFile(response.data, uploadConfig.downloadName || 'rate_data.xlsx')
      setStatus(uploadConfig.successStatus)
      clearFile(fileKey)
      setStatus(uploadConfig.successStatus)
    } catch (err) {
      console.error('Error details:', err)
      setError(await parseRequestError(err, uploadConfig.failureMessage))
    } finally {
      setIsLoading(false)
    }
  }

  const validateUploadFile = (fileKey, file) => {
    if (fileKey === 'pdf') {
      return isPdfFile(file)
    }

    if (fileKey === 'vietnam' || fileKey === 'singapore' || fileKey === 'malaysia') {
      return isExcelFile(file)
    }

    return false
  }

  const handleFileChange = (fileKey, event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (validateUploadFile(fileKey, file)) {
      setSelectedFiles((previousFiles) => ({
        ...previousFiles,
        [fileKey]: file
      }))
      setError('')
      return
    }

    setError(TAB_CONTENT[fileKey].invalidSelectMessage)
    setSelectedFiles((previousFiles) => ({
      ...previousFiles,
      [fileKey]: null
    }))
  }

  const handleDragOver = (event) => {
    if (!activeUploadConfig) return
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event) => {
    if (!activeUploadConfig) return
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event) => {
    if (!activeUploadConfig) return

    event.preventDefault()
    setIsDragOver(false)

    const file = event.dataTransfer.files?.[0]
    if (!file) return

    if (validateUploadFile(activeTab, file)) {
      setSelectedFiles((previousFiles) => ({
        ...previousFiles,
        [activeTab]: file
      }))
      setError('')
      return
    }

    setError(activeUploadConfig.invalidDropMessage)
  }

  return (
    <div className="app">
      <div className="bg-pattern"></div>
      <div className="bg-gradient"></div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16v16H4V4z" stroke="currentColor" strokeWidth="2" />
                <path d="M9 9h6v6H9V9z" fill="currentColor" />
                <path d="M4 9h2M18 9h2M4 15h2M18 15h2M9 4v2M15 4v2M9 18v2M15 18v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-name">Rate Update</span>
              <span className="brand-sub">System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-label">Data Input</span>
            <button
              className={`nav-item ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => handleTabChange('text')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{TAB_CONTENT.text.navLabel}</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'pdf' ? 'active' : ''}`}
              onClick={() => handleTabChange('pdf')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{TAB_CONTENT.pdf.navLabel}</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'vietnam' ? 'active' : ''}`}
              onClick={() => handleTabChange('vietnam')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 12h8M8 16h8M8 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{TAB_CONTENT.vietnam.navLabel}</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'singapore' ? 'active' : ''}`}
              onClick={() => handleTabChange('singapore')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 11h8M8 15h6M8 19h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{TAB_CONTENT.singapore.navLabel}</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'malaysia' ? 'active' : ''}`}
              onClick={() => handleTabChange('malaysia')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 10h8M8 14h8M8 18h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{TAB_CONTENT.malaysia.navLabel}</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-dot online"></div>
            <span>AI Engine Online</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>{activeContent.pageTitle}</h1>
            <p>{activeContent.pageDescription}</p>
          </div>
          <div className="top-bar-actions">
            <div className="help-badge">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Help</span>
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon blue">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="info-card-content">
                <span className="info-card-label">Processing</span>
                <span className="info-card-value">AI-Powered</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon purple">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="info-card-content">
                <span className="info-card-label">Input Type</span>
                <span className="info-card-value">{activeTab === 'text' ? 'Text' : activeTab === 'pdf' ? 'PDF' : 'Excel'}</span>
              </div>
            </div>
          </div>

          <div className="work-card">
            {activeTab === 'text' && (
              <div className="text-section">
                <div className="section-header">
                  <div className="section-info">
                    <h2>{TAB_CONTENT.text.sectionTitle}</h2>
                    <p>{TAB_CONTENT.text.sectionDescription}</p>
                  </div>
                  {contractText && (
                    <button className="action-btn secondary" onClick={clearText}>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Clear Input
                    </button>
                  )}
                </div>

                <div className="input-container">
                  <textarea
                    id="contract-text"
                    value={contractText}
                    onChange={(event) => setContractText(event.target.value)}
                    placeholder={`Paste your hotel contract here...

The AI will automatically extract:
- Hotel name and details
- Room types (Single, Double, Triple)
- Room categories
- Meal plans (BB, HB, FB, AI, RO)
- Rate prices and validity periods
- Child rate policies

Supported formats: Rate sheets, contracts, pricing tables`}
                    disabled={isLoading}
                    className="contract-input"
                  />
                  <div className="input-footer">
                    <div className="input-stats">
                      <span className="stat">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        {contractText.length.toLocaleString()} characters
                      </span>
                      <span className="stat">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {contractText.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeUploadConfig && (
              <div className="pdf-section">
                <div className="section-header">
                  <div className="section-info">
                    <h2>{activeUploadConfig.sectionTitle}</h2>
                    <p>{activeUploadConfig.sectionDescription}</p>
                  </div>
                  {currentSelectedFile && (
                    <button className="action-btn secondary" onClick={() => clearFile(activeTab)}>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Remove File
                    </button>
                  )}
                </div>

                <div
                  className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${currentSelectedFile ? 'has-file' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id={activeUploadConfig.inputId}
                    accept={activeUploadConfig.accept}
                    onChange={(event) => handleFileChange(activeTab, event)}
                    disabled={isLoading}
                  />
                  <label htmlFor={activeUploadConfig.inputId} className="upload-zone-content">
                    {currentSelectedFile ? (
                      <div className="file-selected">
                        <div className="file-icon-large">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8 12h8M8 16h8M8 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <text x="7.5" y="20" fontSize="5.5" fill="currentColor" fontWeight="bold">{activeUploadConfig.fileTypeLabel}</text>
                          </svg>
                        </div>
                        <div className="file-details">
                          <span className="file-name">{currentSelectedFile.name}</span>
                          <span className="file-meta">{(currentSelectedFile.size / 1024).toFixed(1)} KB - {activeUploadConfig.readyMessage}</span>
                        </div>
                        <div className="file-ready-badge">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-prompt">
                        <div className="upload-icon-wrapper">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="upload-text">
                          <span className="upload-primary">{activeUploadConfig.primaryPrompt}</span>
                          <span className="upload-secondary">{activeUploadConfig.secondaryPrompt}</span>
                        </div>
                        <div className="upload-restrictions">
                          <span>{activeUploadConfig.restrictions}</span>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            <div className="action-area">
              <button
                className={`primary-action ${isLoading ? 'loading' : ''}`}
                onClick={activeTab === 'text' ? handleTextSubmit : () => handleUpload(activeTab)}
                disabled={isLoading || (activeTab === 'text' ? !contractText.trim() : !currentSelectedFile)}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{activeContent.buttonLabel}</span>
                  </>
                )}
              </button>
            </div>

            {(status || error) && (
              <div className={`status-banner ${error ? 'error' : 'success'}`}>
                <div className="status-icon">
                  {error ? (
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="status-content">
                  <span className="status-title">{error ? 'Error' : 'Success'}</span>
                  <span className="status-message">{error || status}</span>
                </div>
                <button className="status-close" onClick={resetFeedback}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="features-grid">
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Smart Detection</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Secure Processing</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Excel Export</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Instant Results</span>
            </div>
          </div>
        </div>

        <footer className="main-footer">
          <div className="footer-left">
            <span>(c) 2026 Rate Update System</span>
          </div>
          <div className="footer-right">
            <span className="powered-by">Powered by</span>
            <span className="company-name">Aahaas Solutions</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
