/**
 * Unit tests for db.js - IndexedDB wrapper
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock module loading for browser environment
let TabDatabase, db;

beforeEach(async () => {
  // Import the module code as text and evaluate it
  const fs = require('fs');
  const path = require('path');
  const dbCode = fs.readFileSync(
    path.join(__dirname, '../extension/db.js'),
    'utf-8'
  );

  // Remove the export statement and evaluate
  const codeWithoutExport = dbCode.replace(
    /if \(typeof module.*\n.*\n\}/,
    ''
  );
  eval(codeWithoutExport);

  TabDatabase = global.TabDatabase;
  db = new TabDatabase();
  await db.init();
});

describe('TabDatabase Initialization', () => {
  test('should initialize database successfully', async () => {
    expect(db.db).toBeDefined();
    expect(db.db.name).toBe('EpicTabsDB');
    expect(db.db.version).toBe(1);
  });

  test('should create required object stores', async () => {
    const objectStoreNames = db.db.objectStoreNames;
    expect(objectStoreNames.contains('tabs')).toBe(true);
    expect(objectStoreNames.contains('sessions')).toBe(true);
    expect(objectStoreNames.contains('settings')).toBe(true);
  });
});

describe('Tab Operations', () => {
  test('should save a single tab', async () => {
    const tabData = {
      url: 'https://example.com',
      title: 'Example Site',
      favIconUrl: 'https://example.com/favicon.ico',
    };

    const tabId = await db.saveTab(tabData);
    expect(tabId).toBeDefined();
    expect(typeof tabId).toBe('number');
  });

  test('should save tab with domain extracted from URL', async () => {
    const tabData = {
      url: 'https://github.com/user/repo',
      title: 'GitHub Repo',
    };

    const tabId = await db.saveTab(tabData);
    const tabs = await db.getTabs({ limit: 1 });

    expect(tabs[0].domain).toBe('github.com');
  });

  test('should save multiple tabs in batch', async () => {
    const tabsData = [
      { url: 'https://example1.com', title: 'Example 1' },
      { url: 'https://example2.com', title: 'Example 2' },
      { url: 'https://example3.com', title: 'Example 3' },
    ];

    const tabIds = await db.saveTabs(tabsData);
    expect(tabIds).toHaveLength(3);
    expect(tabIds.every((id) => typeof id === 'number')).toBe(true);
  });

  test('should retrieve tabs with pagination', async () => {
    // Save 10 tabs
    const tabsData = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example${i}.com`,
      title: `Example ${i}`,
    }));

    await db.saveTabs(tabsData);

    // Get first 5 tabs
    const firstPage = await db.getTabs({ limit: 5, offset: 0 });
    expect(firstPage).toHaveLength(5);

    // Get next 5 tabs
    const secondPage = await db.getTabs({ limit: 5, offset: 5 });
    expect(secondPage).toHaveLength(5);
  });

  test('should filter tabs by domain', async () => {
    const tabsData = [
      { url: 'https://github.com/user1', title: 'GitHub 1' },
      { url: 'https://github.com/user2', title: 'GitHub 2' },
      { url: 'https://google.com', title: 'Google' },
    ];

    await db.saveTabs(tabsData);

    const githubTabs = await db.getTabs({ domain: 'github.com' });
    expect(githubTabs).toHaveLength(2);
    expect(githubTabs.every((tab) => tab.domain === 'github.com')).toBe(true);
  });

  test('should delete a single tab', async () => {
    const tabId = await db.saveTab({
      url: 'https://example.com',
      title: 'Example',
    });

    await db.deleteTab(tabId);

    const tabs = await db.getTabs({});
    expect(tabs.find((t) => t.id === tabId)).toBeUndefined();
  });

  test('should delete multiple tabs', async () => {
    const tabIds = await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1' },
      { url: 'https://example2.com', title: 'Example 2' },
    ]);

    await db.deleteTabs(tabIds);

    const tabs = await db.getTabs({});
    expect(tabs.length).toBe(0);
  });
});

describe('Search Operations', () => {
  test('should search tabs by title', async () => {
    await db.saveTabs([
      { url: 'https://github.com', title: 'GitHub Repository' },
      { url: 'https://gitlab.com', title: 'GitLab Repository' },
      { url: 'https://google.com', title: 'Google Search' },
    ]);

    const results = await db.searchTabs('github');
    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('GitHub');
  });

  test('should search tabs by URL', async () => {
    await db.saveTabs([
      { url: 'https://github.com/user/repo', title: 'Repo 1' },
      { url: 'https://github.com/user/other', title: 'Repo 2' },
      { url: 'https://google.com', title: 'Google' },
    ]);

    const results = await db.searchTabs('github.com');
    expect(results).toHaveLength(2);
  });

  test('should be case-insensitive in search', async () => {
    await db.saveTab({
      url: 'https://example.com',
      title: 'Example Website',
    });

    const results = await db.searchTabs('EXAMPLE');
    expect(results).toHaveLength(1);
  });

  test('should limit search results', async () => {
    const tabsData = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.com/${i}`,
      title: `Example ${i}`,
    }));

    await db.saveTabs(tabsData);

    const results = await db.searchTabs('example', 10);
    expect(results).toHaveLength(10);
  });
});

describe('Session Operations', () => {
  test('should create a new session', async () => {
    const sessionId = await db.createSession('My Session');
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('number');
  });

  test('should create session with default name if not provided', async () => {
    const sessionId = await db.createSession();
    const sessions = await db.getSessions();

    expect(sessions[0].name).toContain('Session');
  });

  test('should retrieve all sessions', async () => {
    await db.createSession('Session 1');
    await db.createSession('Session 2');

    const sessions = await db.getSessions();
    expect(sessions).toHaveLength(2);
  });

  test('should get session with tabs', async () => {
    const sessionId = await db.createSession('Test Session');

    await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1', sessionId },
      { url: 'https://example2.com', title: 'Example 2', sessionId },
    ]);

    const session = await db.getSessionWithTabs(sessionId);
    expect(session).toBeDefined();
    expect(session.name).toBe('Test Session');
    expect(session.tabs).toHaveLength(2);
  });

  test('should update session properties', async () => {
    const sessionId = await db.createSession('Old Name');

    await db.updateSession(sessionId, {
      name: 'New Name',
      archived: true,
    });

    const session = await db.getSessionWithTabs(sessionId);
    expect(session.name).toBe('New Name');
    expect(session.archived).toBe(true);
  });

  test('should delete session without deleting tabs', async () => {
    const sessionId = await db.createSession('Test Session');
    await db.saveTab({
      url: 'https://example.com',
      title: 'Example',
      sessionId,
    });

    await db.deleteSession(sessionId, false);

    const sessions = await db.getSessions();
    expect(sessions).toHaveLength(0);

    const tabs = await db.getTabs({});
    expect(tabs).toHaveLength(1);
  });

  test('should delete session and its tabs', async () => {
    const sessionId = await db.createSession('Test Session');
    await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1', sessionId },
      { url: 'https://example2.com', title: 'Example 2', sessionId },
    ]);

    await db.deleteSession(sessionId, true);

    const sessions = await db.getSessions();
    expect(sessions).toHaveLength(0);

    const sessionTabs = await db.getTabs({ sessionId });
    expect(sessionTabs).toHaveLength(0);
  });
});

describe('Statistics', () => {
  test('should get tab count', async () => {
    await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1' },
      { url: 'https://example2.com', title: 'Example 2' },
      { url: 'https://example3.com', title: 'Example 3' },
    ]);

    const count = await db.getTabCount();
    expect(count).toBe(3);
  });

  test('should get overall statistics', async () => {
    await db.createSession('Session 1');
    await db.createSession('Session 2');
    await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1' },
      { url: 'https://example2.com', title: 'Example 2' },
    ]);

    const stats = await db.getStats();
    expect(stats.totalTabs).toBe(2);
    expect(stats.totalSessions).toBe(2);
  });
});

describe('Export and Import', () => {
  test('should export all data', async () => {
    await db.createSession('Test Session');
    await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1' },
      { url: 'https://example2.com', title: 'Example 2' },
    ]);

    const exportData = await db.exportData();

    expect(exportData.tabs).toHaveLength(2);
    expect(exportData.sessions).toHaveLength(1);
    expect(exportData.exportDate).toBeDefined();
    expect(exportData.version).toBe(1);
  });

  test('should import data', async () => {
    const importData = {
      tabs: [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example',
          domain: 'example.com',
          timestamp: Date.now(),
          sessionId: null,
          tags: [],
          metadata: {},
        },
      ],
      sessions: [
        {
          id: 1,
          name: 'Imported Session',
          timestamp: Date.now(),
          tabIds: [],
          archived: false,
          metadata: {},
        },
      ],
      settings: [],
      version: 1,
    };

    await db.importData(importData);

    const tabs = await db.getTabs({});
    const sessions = await db.getSessions();

    expect(tabs.length).toBeGreaterThan(0);
    expect(sessions.length).toBeGreaterThan(0);
  });
});

describe('Clear Operations', () => {
  test('should clear all data', async () => {
    await db.createSession('Test Session');
    await db.saveTabs([
      { url: 'https://example1.com', title: 'Example 1' },
      { url: 'https://example2.com', title: 'Example 2' },
    ]);

    await db.clearAll();

    const tabs = await db.getTabs({});
    const sessions = await db.getSessions();

    expect(tabs).toHaveLength(0);
    expect(sessions).toHaveLength(0);
  });
});
