const express = require('express');
const app = express();

// Potential SQL injection risk (string interpolation)
function findUser(db, username) {
  return db.query(`SELECT * FROM users WHERE username = '${username}'`);
}

// Potential XSS
app.get('/hello', (req, res) => {
  const name = req.query.name || 'world';
  res.send(`<div>Hello ${name}</div>`);
});

module.exports = { findUser };



