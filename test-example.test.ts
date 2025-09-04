import { Calculator, validateEmail, processUser, generateId } from './test-example';

describe('Calculator', () => {
  let calculator: Calculator;
  
  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('add', () => {
    test('should add two positive numbers', () => {
      expect(calculator.add(1, 2)).toBe(3);
    });

    test('should add zero', () => {
      expect(calculator.add(0, 5)).toBe(5);
    });

    test('should add negative numbers', () => {
      expect(calculator.add(-1, -2)).toBe(-3);
    });
  });

  describe('divide', () => {
    test('should divide two numbers', () => {
      expect(calculator.divide(10, 2)).toBe(5);
    });

    test('should throw error when dividing by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
    });
  });

  describe('fetchData', () => {
    test('should fetch data with url only', async () => {
      const result = await calculator.fetchData('https://api.example.com');
      expect(result).toEqual({ data: 'mock' });
    });
  });
});

describe('validateEmail', () => {
  test('should validate correct email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  test('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  test('should reject empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});