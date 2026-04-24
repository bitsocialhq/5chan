// Polyfills for Node.js built-ins
import { Buffer } from 'buffer';
import process from 'process';
import 'isomorphic-fetch';

window.Buffer = Buffer;
window.process = process;
window.global = window;

// For ethers.js
window.process.version = ''; // Fake Node.js version
window.process.env = window.process.env || {};

// Add any missing fetch polyfill
if (!window.fetch) {
  console.warn('Fetch API is not available, using polyfill');
}

if (typeof window.crypto === 'undefined' || typeof window.crypto.getRandomValues !== 'function') {
  throw new Error('crypto.getRandomValues is required for secure account and signature operations.');
}
