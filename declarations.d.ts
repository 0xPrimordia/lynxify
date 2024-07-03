// declarations.d.ts
declare module 'process/browser' {
    import process from 'process';
    export = process;
  }
  
  declare module 'buffer' {
    import { Buffer } from 'buffer';
    export { Buffer };
  }
  
  declare module 'crypto-browserify';
  declare module 'stream-browserify';
  