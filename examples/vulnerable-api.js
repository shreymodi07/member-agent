// Example JavaScript file for testing
const express = require('express');
const app = express();

// Potential security issue: no input validation
app.post('/patient-data', (req, res) => {
  const { patientId, data } = req.body;
  
  // HIPAA violation: logging PHI without encryption
  console.log(`Processing patient data for ${patientId}: ${JSON.stringify(data)}`);
  
  // SQL injection vulnerability
  const query = `SELECT * FROM patients WHERE id = '${patientId}'`;
  
  // Hardcoded API key - security issue
  const apiKey = 'sk-1234567890abcdef';
  
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
