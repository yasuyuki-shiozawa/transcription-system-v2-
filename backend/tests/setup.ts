// Global test setup for backend tests
import { Server } from 'http';

// Jest globals type definitions
declare global {
  var jest: any;
  var beforeEach: any;
  var afterEach: any;
  var describe: any;
  var it: any;
  var expect: any;
}

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests unless explicitly testing them
const originalConsole = global.console;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any lingering timers
  jest.clearAllTimers();
});

// Utility to suppress console output in tests
export const suppressConsole = () => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
};

// Utility to restore console output
export const restoreConsole = () => {
  global.console = originalConsole;
};

// Helper to create mock HTTP server
export const createMockServer = (): Server => {
  const server = new Server();
  return server;
};

// WebSocket test utilities
export const waitForSocketEvent = (socket: any, event: string, timeout = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event} event`));
    }, timeout);

    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

export const waitForMultipleSocketEvents = (
  socket: any, 
  events: string[], 
  timeout = 5000
): Promise<any[]> => {
  return Promise.all(
    events.map(event => waitForSocketEvent(socket, event, timeout))
  );
};