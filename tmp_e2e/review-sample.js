// Simple code with some intentional issues
function add(a, b) {
  return a + b; // no type checks
}

// Security risk: eval
function runUserCode(code) {
  return eval(code);
}

module.exports = { add, runUserCode };



