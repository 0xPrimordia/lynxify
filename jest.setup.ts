import '@testing-library/jest-dom';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
    namespace jest {
        interface Matchers<R = void> extends TestingLibraryMatchers<R, any> {}
    }
}

require('dotenv').config({ path: '.env.local' }); 