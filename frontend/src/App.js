import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setResult(null);
      setError(null);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:image/jpeg;base64, prefix
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedImage || !question.trim()) {
      setError('Please select an image and enter a question.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64Image = await convertToBase64(selectedImage);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/analyze`, {
        image_base64: base64Image,
        question: question
      });

      setResult(response.data);
      setShowReport(false); // Close report modal when new results come in
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while analyzing the image.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setQuestion('');
    setResult(null);
    setError(null);
    setShowReport(false);
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🏗️ ProStruct AI Estimator</h1>
          <p>Structural Engineering Analysis with AI</p>
        </header>

        <div className="main-content">
          {result && (
            <>
              {/* Analysis Summary Banner */}
              <div className="results-summary">
                {imagePreview && (
                  <div className="summary-image">
                    <img src={imagePreview} alt="Analyzed structure" />
                  </div>
                )}
                <div className="summary-content">
                  <h2>✅ Analysis Complete</h2>
                  <p>Your structural analysis is ready. View the detailed technical report below.</p>
                  <button 
                    className="view-report-button"
                    onClick={() => setShowReport(!showReport)}
                  >
                    {showReport ? '📖 Hide Technical Report' : '📋 Show Technical Report'}
                  </button>
                </div>
              </div>

              {/* Technical Report Popup (Inline) */}
              {showReport && (
                <div className="technical-report-popup">
                  <div className="popup-header">
                    <h3>📋 Technical Inspection Report</h3>
                    <button className="popup-close" onClick={() => setShowReport(false)}>✕</button>
                  </div>
                  <div className="popup-body">
                    <ReactMarkdown
                      components={{
                        table: ({node, ...props}) => (
                          <div className="table-wrapper">
                            <table {...props} />
                          </div>
                        ),
                      }}
                    >
                      {result.analysis}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Expert Recommendations - Always Visible */}
              <div className="expert-section">
                <div className="expert-header">
                  <span className="expert-icon">👨‍🔬</span>
                  <h2>Engineering Assessment & Recommendations</h2>
                </div>
                <div className="expert-body">
                  <ReactMarkdown
                    components={{
                      table: ({node, ...props}) => (
                        <div className="table-wrapper">
                          <table {...props} />
                        </div>
                      ),
                    }}
                  >
                    {result.response}
                  </ReactMarkdown>
                </div>
              </div>

              {/* CTA Section */}
              <div className="cta-section">
                <div className="cta-icon-large">📞</div>
                <h3>Ready for a Professional Site Visit?</h3>
                <p>Get permit-ready structural drawings and calculations from licensed engineers.</p>
                <button className="cta-button-large">Request Free Quote</button>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-group">
              <label htmlFor="image-upload" className="file-label">
                {imagePreview ? '✓ Image Selected' : '📷 Upload Construction Image'}
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
            </div>

            {imagePreview && !result && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="question">Your Question</label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What type of beam is this? Is this load-bearing? Do I need a structural permit?"
                rows="4"
                className="question-input"
              />
            </div>

            <div className="button-group">
              <button 
                type="submit" 
                disabled={loading || !selectedImage || !question.trim()}
                className="submit-button"
              >
                {loading ? '🔄 Analyzing...' : '🚀 Analyze Project'}
              </button>
              
              {(selectedImage || question || result) && (
                <button 
                  type="button" 
                  onClick={handleReset}
                  className="reset-button"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="error-box">
              <h3>❌ Error</h3>
              <p>{error}</p>
            </div>
          )}
        </div>

        <footer className="footer">
          <p>ProStruct Engineering | CA, WA, OR</p>
          <p className="disclaimer">
            ⚠️ This is a preliminary AI analysis. Always consult with a licensed engineer for legal permits.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
