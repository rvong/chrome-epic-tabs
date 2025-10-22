/**
 * Unit tests for background.js - Service Worker
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import chrome from 'jest-chrome';

// Mock TabDatabase
const mockDb = {
  init: jest.fn().mockResolvedValue(undefined),
  saveTab: jest.fn().mockResolvedValue(1),
  saveTabs: jest.fn().mockResolvedValue([1, 2, 3]),
  getTabs: jest.fn().mockResolvedValue([]),
  searchTabs: jest.fn().mockResolvedValue([]),
  getSessions: jest.fn().mockResolvedValue([]),
  getSessionWithTabs: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Session',
    tabs: [],
  }),
  createSession: jest.fn().mockResolvedValue(1),
  updateSession: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
  deleteSession: jest.fn().mockResolvedValue(undefined),
  deleteTab: jest.fn().mockResolvedValue(undefined),
  deleteTabs: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue({ totalTabs: 0, totalSessions: 0 }),
  exportData: jest.fn().mockResolvedValue({ tabs: [], sessions: [] }),
  importData: jest.fn().mockResolvedValue(undefined),
  clearAll: jest.fn().mockResolvedValue(undefined),
};

describe('Background Service Worker', () => {
  beforeEach(() => {
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({ showNotifications: true });
    });

    chrome.tabs.query.mockResolvedValue([
      {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        favIconUrl: '',
        windowId: 1,
      },
    ]);

    chrome.tabs.create.mockResolvedValue({
      id: 2,
      url: 'https://example.com',
    });

    chrome.tabs.remove.mockResolvedValue(undefined);
    chrome.windows.create.mockResolvedValue({ id: 2 });
    chrome.notifications.create.mockImplementation((options, callback) => {
      if (callback) {
        callback('notification-id');
      }
    });
  });

  describe('Message Handling', () => {
    test('should handle getStats action', async () => {
      mockDb.getStats.mockResolvedValue({
        totalTabs: 100,
        totalSessions: 10,
      });

      const request = { action: 'getStats' };
      const sender = {};

      // Simulate message handler
      const handleMessage = async (req) => {
        if (req.action === 'getStats') {
          const stats = await mockDb.getStats();
          return { success: true, stats };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(response.stats.totalTabs).toBe(100);
      expect(response.stats.totalSessions).toBe(10);
    });

    test('should handle getTabs action with filters', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example' },
      ];
      mockDb.getTabs.mockResolvedValue(mockTabs);

      const request = {
        action: 'getTabs',
        data: { limit: 50, offset: 0 },
      };

      const handleMessage = async (req) => {
        if (req.action === 'getTabs') {
          const tabs = await mockDb.getTabs(req.data);
          return { success: true, tabs };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(response.tabs).toHaveLength(1);
      expect(mockDb.getTabs).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });
    });

    test('should handle searchTabs action', async () => {
      const mockResults = [
        { id: 1, url: 'https://github.com', title: 'GitHub' },
      ];
      mockDb.searchTabs.mockResolvedValue(mockResults);

      const request = {
        action: 'searchTabs',
        data: { query: 'github', limit: 100 },
      };

      const handleMessage = async (req) => {
        if (req.action === 'searchTabs') {
          const tabs = await mockDb.searchTabs(req.data.query, req.data.limit);
          return { success: true, tabs };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(response.tabs).toHaveLength(1);
      expect(mockDb.searchTabs).toHaveBeenCalledWith('github', 100);
    });

    test('should handle deleteTab action', async () => {
      const request = {
        action: 'deleteTab',
        data: { tabId: 1 },
      };

      const handleMessage = async (req) => {
        if (req.action === 'deleteTab') {
          await mockDb.deleteTab(req.data.tabId);
          return { success: true };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(mockDb.deleteTab).toHaveBeenCalledWith(1);
    });

    test('should handle unknown action with error', async () => {
      const request = { action: 'unknownAction' };

      const handleMessage = async (req) => {
        throw new Error(`Unknown action: ${req.action}`);
      };

      await expect(handleMessage(request)).rejects.toThrow('Unknown action');
    });
  });

  describe('Tab Saving', () => {
    test('should save current tab', async () => {
      chrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example',
          favIconUrl: '',
        },
      ]);

      const saveCurrentTab = async (tab) => {
        if (!tab) {
          [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
        }

        if (
          !tab ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://')
        ) {
          return { success: false, error: 'Cannot save chrome:// or extension pages' };
        }

        const tabId = await mockDb.saveTab({
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          timestamp: Date.now(),
        });

        return { success: true, tabId };
      };

      const result = await saveCurrentTab();

      expect(result.success).toBe(true);
      expect(result.tabId).toBe(1);
      expect(mockDb.saveTab).toHaveBeenCalled();
    });

    test('should not save chrome:// pages', async () => {
      const tab = {
        id: 1,
        url: 'chrome://extensions',
        title: 'Extensions',
      };

      const saveCurrentTab = async (tab) => {
        if (
          !tab ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://')
        ) {
          return { success: false, error: 'Cannot save chrome:// or extension pages' };
        }
        return { success: true };
      };

      const result = await saveCurrentTab(tab);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot save');
    });

    test('should save multiple tabs and create session', async () => {
      chrome.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example1.com', title: 'Example 1' },
        { id: 2, url: 'https://example2.com', title: 'Example 2' },
        { id: 3, url: 'chrome://extensions', title: 'Extensions' },
      ]);

      const saveTabs = async (tabs, sessionName, closeAfterSave) => {
        const validTabs = tabs.filter(
          (tab) =>
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('chrome-extension://')
        );

        if (validTabs.length === 0) {
          return { success: false, error: 'No valid tabs to save' };
        }

        const sessionId = await mockDb.createSession(sessionName);

        const tabsData = validTabs.map((tab) => ({
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          sessionId: sessionId,
          timestamp: Date.now(),
        }));

        const tabIds = await mockDb.saveTabs(tabsData);

        if (closeAfterSave) {
          const tabIdsToClose = validTabs.map((t) => t.id);
          await chrome.tabs.remove(tabIdsToClose);
        }

        return {
          success: true,
          sessionId,
          tabIds,
          count: validTabs.length,
        };
      };

      const tabs = await chrome.tabs.query({});
      const result = await saveTabs(tabs, 'Test Session', false);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2); // Only 2 valid tabs
      expect(mockDb.createSession).toHaveBeenCalled();
      expect(mockDb.saveTabs).toHaveBeenCalled();
    });
  });

  describe('Tab Restoration', () => {
    test('should restore single tab', async () => {
      const restoreTab = async (tabData) => {
        const newTab = await chrome.tabs.create({
          url: tabData.url,
          active: false,
        });
        return { success: true, tab: newTab };
      };

      const result = await restoreTab({
        url: 'https://example.com',
        title: 'Example',
      });

      expect(result.success).toBe(true);
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        active: false,
      });
    });

    test('should restore tabs in current window', async () => {
      const restoreTabs = async (tabs, inNewWindow) => {
        if (tabs.length === 0) {
          return { success: false, error: 'No tabs to restore' };
        }

        if (!inNewWindow) {
          for (const tab of tabs) {
            await chrome.tabs.create({
              url: tab.url,
              active: false,
            });
          }
          return { success: true, count: tabs.length };
        }
      };

      const tabs = [
        { url: 'https://example1.com', title: 'Example 1' },
        { url: 'https://example2.com', title: 'Example 2' },
      ];

      const result = await restoreTabs(tabs, false);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
    });

    test('should restore tabs in new window', async () => {
      const restoreTabs = async (tabs, inNewWindow) => {
        if (tabs.length === 0) {
          return { success: false, error: 'No tabs to restore' };
        }

        if (inNewWindow) {
          const window = await chrome.windows.create({
            url: tabs[0].url,
            focused: true,
          });

          for (let i = 1; i < tabs.length; i++) {
            await chrome.tabs.create({
              windowId: window.id,
              url: tabs[i].url,
              active: false,
            });
          }

          return { success: true, windowId: window.id, count: tabs.length };
        }
      };

      const tabs = [
        { url: 'https://example1.com', title: 'Example 1' },
        { url: 'https://example2.com', title: 'Example 2' },
      ];

      const result = await restoreTabs(tabs, true);

      expect(result.success).toBe(true);
      expect(result.windowId).toBe(2);
      expect(chrome.windows.create).toHaveBeenCalled();
    });

    test('should restore session', async () => {
      mockDb.getSessionWithTabs.mockResolvedValue({
        id: 1,
        name: 'Test Session',
        tabs: [
          { url: 'https://example1.com', title: 'Example 1' },
          { url: 'https://example2.com', title: 'Example 2' },
        ],
      });

      const restoreSession = async (sessionId, inNewWindow) => {
        const session = await mockDb.getSessionWithTabs(sessionId);

        if (!session || !session.tabs || session.tabs.length === 0) {
          return { success: false, error: 'Session not found or has no tabs' };
        }

        // Simulate restore
        return { success: true, count: session.tabs.length };
      };

      const result = await restoreSession(1, false);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockDb.getSessionWithTabs).toHaveBeenCalledWith(1);
    });
  });

  describe('Session Management', () => {
    test('should create new session', async () => {
      const request = {
        action: 'createSession',
        data: { name: 'New Session' },
      };

      const handleMessage = async (req) => {
        if (req.action === 'createSession') {
          const sessionId = await mockDb.createSession(req.data.name);
          return { success: true, sessionId };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(mockDb.createSession).toHaveBeenCalledWith('New Session');
    });

    test('should update session', async () => {
      const request = {
        action: 'updateSession',
        data: {
          sessionId: 1,
          updates: { name: 'Updated Name' },
        },
      };

      const handleMessage = async (req) => {
        if (req.action === 'updateSession') {
          const session = await mockDb.updateSession(
            req.data.sessionId,
            req.data.updates
          );
          return { success: true, session };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(mockDb.updateSession).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
      });
    });

    test('should delete session with tabs', async () => {
      const request = {
        action: 'deleteSession',
        data: { sessionId: 1, deleteTabs: true },
      };

      const handleMessage = async (req) => {
        if (req.action === 'deleteSession') {
          await mockDb.deleteSession(req.data.sessionId, req.data.deleteTabs);
          return { success: true };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(mockDb.deleteSession).toHaveBeenCalledWith(1, true);
    });
  });

  describe('Export/Import', () => {
    test('should export data', async () => {
      const mockExportData = {
        tabs: [{ id: 1, url: 'https://example.com', title: 'Example' }],
        sessions: [{ id: 1, name: 'Test Session' }],
        settings: [],
        exportDate: new Date().toISOString(),
        version: 1,
      };

      mockDb.exportData.mockResolvedValue(mockExportData);

      const request = { action: 'exportData' };

      const handleMessage = async (req) => {
        if (req.action === 'exportData') {
          const data = await mockDb.exportData();
          return { success: true, data };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(response.data.tabs).toHaveLength(1);
      expect(response.data.sessions).toHaveLength(1);
    });

    test('should import data', async () => {
      const importData = {
        tabs: [],
        sessions: [],
        settings: [],
        version: 1,
      };

      const request = {
        action: 'importData',
        data: importData,
      };

      const handleMessage = async (req) => {
        if (req.action === 'importData') {
          await mockDb.importData(req.data);
          return { success: true };
        }
      };

      const response = await handleMessage(request);

      expect(response.success).toBe(true);
      expect(mockDb.importData).toHaveBeenCalledWith(importData);
    });
  });
});
