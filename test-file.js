// Test file with intentional issues
function processUserInput(userInput) {
  // Fixed: replaced eval with JSON.parse for safe parsing
  try {
    const result = JSON.parse(userInput);
    return result;
  } catch (error) {
    console.error('Invalid input:', error);
    return null;
  }
}

// Missing input validation
function saveToDatabase(data) {
  db.save(data);
}

module.exports = { processUserInput, saveToDatabase };

