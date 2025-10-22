/**
 * Jest Setup - Mock Chrome APIs, IndexedDB, and Dexie
 */

// Mock Chrome APIs using jest-chrome
import chrome from 'jest-chrome';
global.chrome = chrome;

// Mock IndexedDB using fake-indexeddb
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Import Dexie for testing
import Dexie from 'dexie';
global.Dexie = Dexie;

// Configure Dexie to use fake-indexeddb
Dexie.dependencies.indexedDB = global.indexedDB;
Dexie.dependencies.IDBKeyRange = global.IDBKeyRange;

// Reset IndexedDB for each test
beforeEach(() => {
  global.indexedDB = new IDBFactory();
  // Update Dexie to use the new IndexedDB instance
  Dexie.dependencies.indexedDB = global.indexedDB;
  Dexie.dependencies.IDBKeyRange = global.IDBKeyRange;

  chrome.runtime.sendMessage.mockClear();
  chrome.storage.sync.get.mockClear();
  chrome.storage.sync.set.mockClear();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Helper to wait for async operations
global.waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to wait for IndexedDB operations
global.waitForDB = () => new Promise((resolve) => setTimeout(resolve, 50));
