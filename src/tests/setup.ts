import '@testing-library/jest-dom';
import fetch, { Response, Request } from 'node-fetch';

interface MockSetImmediate {
    (callback: (...args: any[]) => void): NodeJS.Immediate;
    __promisify__: <T>(value?: T, options?: any) => Promise<T>;
}

// Add fetch to global
global.fetch = fetch as any;
global.Request = Request as any;
global.Response = Response as any;

const mockSetImmediate = jest.fn((callback) => ({ _onImmediate: callback })) as unknown as MockSetImmediate;
mockSetImmediate.__promisify__ = jest.fn(<T>(value?: T) => Promise.resolve(value)) as MockSetImmediate['__promisify__'];

global.setImmediate = mockSetImmediate as unknown as typeof setImmediate;
global.clearImmediate = jest.fn(); 