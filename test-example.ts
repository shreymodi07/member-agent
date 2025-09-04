// Test file for spec coverage analysis
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }

  async fetchData(url: string, options?: { timeout?: number; retries?: number }): Promise<any> {
    // Mock implementation
    return { data: 'mock' };
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function processUser(
  user: { name: string; age?: number; isActive: boolean },
  settings: { theme: 'light' | 'dark'; notifications: boolean } = { theme: 'light', notifications: true }
): string {
  if (!user.name) {
    return 'Invalid user';
  }
  
  return `User ${user.name} (${user.age || 'unknown'}) - ${settings.theme} theme`;
}

// Arrow function
export const generateId = (prefix: string = 'id', length: number = 8): string => {
  return prefix + Math.random().toString(36).substring(2, 2 + length);
};