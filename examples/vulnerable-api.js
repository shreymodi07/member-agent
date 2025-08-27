// Example JavaScript file for testing - UPDATED with security fixes
const express = require('express');
const app = express();

// Added input validation middleware
app.use(express.json({ limit: '10mb' }));

// Improved security: added input validation
app.post('/patient-data', (req, res) => {
  const { patientId, data } = req.body;
  
  // Input validation added
  if (!patientId || typeof patientId !== 'string') {
    return res.status(400).json({ error: 'Invalid patient ID' });
  }
  
  // Fixed: PHI data no longer logged in plain text
  console.log(`Processing patient data for patient: ${patientId.substring(0, 3)}***`);
  
  // Fixed: Using parameterized queries (simulated)
  const query = 'SELECT * FROM patients WHERE id = ?';
  const params = [patientId];
  
  // Fixed: API key moved to environment variable
  const apiKey = process.env.API_KEY;
  
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
