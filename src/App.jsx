import { useState } from 'react'
import axios from 'axios'
import './App.css'

// Use relative URL for Vercel deployment (works both locally and in production)
const API_BASE = ''

function App() {
  const [activeTab, setActiveTab] = useState('text')
  const [contractText, setContractText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [extractedCount, setExtractedCount] = useState(null)

  const clearText = () => {
    setContractText('')
    setError('')
    setStatus('')
    setExtractedCount(null)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError('')
    setStatus('')
    setExtractedCount(null)
    const fileInput = document.getElementById('pdf-upload')
    if (fileInput) fileInput.value = ''
  }

  const handleTextSubmit = async () => {
    if (!contractText.trim()) {
      setError('Please enter contract text')
      return
    }

    setIsLoading(true)
    setError('')
    setStatus('Analyzing contract data...')
    setExtractedCount(null)

    try {
      const response = await axios.post(`${API_BASE}/api/extract-text`, {
        chatInput: contractText
      }, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        throw new Error(errorData.error || errorData.message || 'Server error')
      }

      downloadFile(response.data, 'rate_data.xlsx')
      setStatus('Rate data extracted and downloaded successfully!')
      setContractText('')
    } catch (err) {
      console.error('Error details:', err)
      if (err.response) {
        const errorText = err.response.data instanceof Blob 
          ? await err.response.data.text() 
          : JSON.stringify(err.response.data)
        console.error('Server response:', errorText)
        try {
          const errorObj = JSON.parse(errorText)
          const message = typeof errorObj.error === 'string'
            ? errorObj.error
            : errorObj.error?.message || errorObj.details || errorObj.message || 'Server error'
          setError(message)
        } catch {
          setError(`Server error: ${err.response.status}`)
        }
      } else if (err.request) {
        setError('Cannot connect to server. Please check your connection.')
      } else {
        setError(err.message || 'Failed to process contract. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file')
      return
    }

    setIsLoading(true)
    setError('')
    setStatus('Extracting data from PDF...')
    setExtractedCount(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await axios.post(`${API_BASE}/api/extract-pdf`, formData, {
        responseType: 'blob'
      })

      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        throw new Error(errorData.error || errorData.message || 'Server error')
      }

      downloadFile(response.data, 'rate_data.xlsx')
      setStatus('PDF processed and rate data downloaded!')
      setSelectedFile(null)
      const fileInput = document.getElementById('pdf-upload')
      if (fileInput) fileInput.value = ''
    } catch (err) {
      console.error('Error details:', err)
      if (err.response) {
        const errorText = err.response.data instanceof Blob 
          ? await err.response.data.text() 
          : JSON.stringify(err.response.data)
        console.error('Server response:', errorText)
        try {
          const errorObj = JSON.parse(errorText)
          const message = typeof errorObj.error === 'string'
            ? errorObj.error
            : errorObj.error?.message || errorObj.details || errorObj.message || 'Server error'
          setError(message)
        } catch {
          setError(`Server error: ${err.response.status}`)
        }
      } else if (err.request) {
        setError('Cannot connect to server. Please check your connection.')
      } else {
        setError(err.message || 'Failed to process PDF. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
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

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError('')
    } else if (file) {
      setError('Please select a valid PDF file')
      setSelectedFile(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError('')
    } else if (file) {
      setError('Please drop a valid PDF file')
    }
  }

  return (
    <div className="app">
      {/* Background Elements */}
      <div className="bg-pattern"></div>
      <div className="bg-gradient"></div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16v16H4V4z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 9h6v6H9V9z" fill="currentColor"/>
                <path d="M4 9h2M18 9h2M4 15h2M18 15h2M9 4v2M15 4v2M9 18v2M15 18v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
              onClick={() => { setActiveTab('text'); setError(''); setStatus(''); }}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Contract Text</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'pdf' ? 'active' : ''}`}
              onClick={() => { setActiveTab('pdf'); setError(''); setStatus(''); }}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>PDF Upload</span>
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

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="page-title">
            <h1>{activeTab === 'text' ? 'Contract Text Extraction' : 'PDF Document Upload'}</h1>
            <p>Extract and validate hotel rate data using AI-powered analysis</p>
          </div>
          <div className="top-bar-actions">
            <div className="help-badge">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Help</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-wrapper">
          {/* Info Cards */}
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon blue">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="info-card-content">
                <span className="info-card-label">Format</span>
                <span className="info-card-value">DD/MM/YYYY</span>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="work-card">
            {activeTab === 'text' && (
              <div className="text-section">
                <div className="section-header">
                  <div className="section-info">
                    <h2>Paste Contract Data</h2>
                    <p>Enter hotel contract text containing rate information for extraction</p>
                  </div>
                  {contractText && (
                    <button className="action-btn secondary" onClick={clearText}>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Clear Input
                    </button>
                  )}
                </div>
                
                <div className="input-container">
                  <textarea
                    id="contract-text"
                    value={contractText}
                    onChange={(e) => setContractText(e.target.value)}
                    placeholder="Paste your hotel contract here...

The AI will automatically extract:
• Hotel name and details
• Room types (Single, Double, Triple)
• Room categories
• Meal plans (BB, HB, FB, AI, RO)
• Rate prices and validity periods
• Child rate policies

Supported formats: Rate sheets, contracts, pricing tables"
                    disabled={isLoading}
                    className="contract-input"
                  />
                  <div className="input-footer">
                    <div className="input-stats">
                      <span className="stat">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        {contractText.length.toLocaleString()} characters
                      </span>
                      <span className="stat">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {contractText.split(/\s+/).filter(w => w).length} words
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pdf' && (
              <div className="pdf-section">
                <div className="section-header">
                  <div className="section-info">
                    <h2>Upload PDF Document</h2>
                    <p>Upload a contract document for automatic text extraction and rate analysis</p>
                  </div>
                  {selectedFile && (
                    <button className="action-btn secondary" onClick={clearFile}>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Remove File
                    </button>
                  )}
                </div>

                <div 
                  className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="pdf-upload"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                  <label htmlFor="pdf-upload" className="upload-zone-content">
                    {selectedFile ? (
                      <div className="file-selected">
                        <div className="file-icon-large">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5"/>
                            <text x="8" y="18" fontSize="6" fill="currentColor" fontWeight="bold">PDF</text>
                          </svg>
                        </div>
                        <div className="file-details">
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-meta">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for processing</span>
                        </div>
                        <div className="file-ready-badge">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-prompt">
                        <div className="upload-icon-wrapper">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="upload-text">
                          <span className="upload-primary">Drag and drop your PDF here</span>
                          <span className="upload-secondary">or <span className="upload-link">browse</span> to select a file</span>
                        </div>
                        <div className="upload-restrictions">
                          <span>Supported: PDF • Max size: 10MB</span>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Action Area */}
            <div className="action-area">
              <button 
                className={`primary-action ${isLoading ? 'loading' : ''}`}
                onClick={activeTab === 'text' ? handleTextSubmit : handleFileUpload}
                disabled={isLoading || (activeTab === 'text' ? !contractText.trim() : !selectedFile)}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Extract Rates & Download Excel</span>
                  </>
                )}
              </button>
            </div>

            {/* Status Messages */}
            {(status || error) && (
              <div className={`status-banner ${error ? 'error' : 'success'}`}>
                <div className="status-icon">
                  {error ? (
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="status-content">
                  <span className="status-title">{error ? 'Error' : 'Success'}</span>
                  <span className="status-message">{error || status}</span>
                </div>
                <button className="status-close" onClick={() => { setError(''); setStatus(''); }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Feature Highlights */}
          <div className="features-grid">
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Smart Detection</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>Secure Processing</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>Excel Export</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Instant Results</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="main-footer">
          <div className="footer-left">
            <span>© 2026 Rate Update System</span>
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
