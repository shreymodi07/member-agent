// Simple JavaScript function with potential issues
function loginUser(username, password) {
    // Direct password comparison (security issue)
    if (password === "admin123") {
        return { success: true, token: "abc123" };
    }
    
    // SQL injection vulnerability
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    
    // Missing error handling
    const result = database.query(query);
    
    return result;
}

// Potential XSS vulnerability
function displayMessage(userInput) {
    document.innerHTML = userInput;
}
