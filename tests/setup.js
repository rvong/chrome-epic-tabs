/**
 * Jest Setup - Mock Chrome APIs, IndexedDB, and Dexie
 */

// Polyfill structuredClone for Node.js versions that don't have it
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock IndexedDB using fake-indexeddb
require('fake-indexeddb/auto');
const { IDBFactory } = require('fake-indexeddb');

// Import Dexie for testing
const Dexie = require('dexie');
global.Dexie = Dexie;

// Configure Dexie to use fake-indexeddb
Dexie.dependencies.indexedDB = global.indexedDB;
Dexie.dependencies.IDBKeyRange = global.IDBKeyRange;

// Create a simple Chrome API mock
const createChromeMock = () => ({
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
      }),
    },
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
      }),
    },
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([])),
    create: jest.fn((createProperties) =>
      Promise.resolve({
        id: Math.floor(Math.random() * 10000),
        ...createProperties,
      })
    ),
    remove: jest.fn(() => Promise.resolve()),
    get: jest.fn((tabId) =>
      Promise.resolve({
        id: tabId,
        url: 'https://example.com',
        title: 'Example',
      })
    ),
  },
  windows: {
    create: jest.fn((createData) =>
      Promise.resolve({
        id: Math.floor(Math.random() * 1000),
        ...createData,
      })
    ),
    get: jest.fn((windowId) =>
      Promise.resolve({
        id: windowId,
        focused: true,
      })
    ),
  },
  notifications: {
    create: jest.fn((notificationId, options, callback) => {
      if (callback) callback('notification-id');
    }),
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: jest.fn(),
    },
  },
  scripting: {
    executeScript: jest.fn(() => Promise.resolve([])),
  },
});

// Set up global chrome object
global.chrome = createChromeMock();

// Reset IndexedDB and Chrome mocks for each test
beforeEach(() => {
  global.indexedDB = new IDBFactory();
  // Update Dexie to use the new IndexedDB instance
  Dexie.dependencies.indexedDB = global.indexedDB;
  Dexie.dependencies.IDBKeyRange = global.IDBKeyRange;

  // Reset chrome mocks
  global.chrome = createChromeMock();
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
