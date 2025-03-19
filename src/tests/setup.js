const { TextEncoder, TextDecoder } = require('util');
const nodeFetch = require('node-fetch');

// Add fetch to global
global.fetch = nodeFetch;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock ReadableStream
class MockReadableStream {
    constructor(source) {
        this._source = source;
    }

    getReader() {
        let done = false;
        let value = this._source;
        return {
            read() {
                if (done) {
                    return Promise.resolve({ done: true });
                }
                done = true;
                return Promise.resolve({ done: false, value });
            },
            releaseLock() {}
        };
    }
}

global.ReadableStream = MockReadableStream;

// Mock setImmediate
global.setImmediate = jest.fn((callback, ...args) => {
    setTimeout(callback, 0, ...args);
    return { _onImmediate: callback };
});

global.clearImmediate = jest.fn();

// Mock localStorage
global.localStorage = {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn().mockReturnValue(null)
};

// Mock sessionStorage
global.sessionStorage = {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn().mockReturnValue(null)
};

// Mock window.crypto
global.crypto = {
    getRandomValues: jest.fn((buffer) => {
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
    }),
    subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
};

// Mock fetch with better error handling
global.fetch = jest.fn((url, options) => {
    if (url.includes('/api/auth/verify')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true })
        });
    }
    
    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
        body: null,
        bodyUsed: false,
        url: url,
        type: 'default',
        redirected: false,
        clone: () => ({}),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        text: () => Promise.resolve('')
    });
}); 