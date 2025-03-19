// React testing library setup
import '@testing-library/jest-dom';
import React from 'react';

// Setup global mocks
global.React = React;

// Mock crypto for UUID generation
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => '12345678-1234-1234-1234-123456789012'
  };
}

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    headers: new Headers()
  })
);

// Mock TextEncoder/TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = class {
    encode(str) {
      return Buffer.from(str);
    }
  };
}

if (!global.TextDecoder) {
  global.TextDecoder = class {
    decode(buffer) {
      return Buffer.from(buffer).toString();
    }
  };
}

// Mock ReadableStream
if (!global.ReadableStream) {
  global.ReadableStream = class {
    constructor() {}
    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        releaseLock: () => {}
      };
    }
  };
}

// Mock setImmediate
if (!global.setImmediate) {
  global.setImmediate = (callback) => setTimeout(callback, 0);
}

// Configure Jest environment
jest.setTimeout(30000); // 30 second timeout

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 