/**
 * Dexie.js wrapper for efficient storage of hundreds of thousands of tabs
 * Using Dexie.js - a minimalistic wrapper for IndexedDB
 */

// Dexie will be loaded via importScripts in background.js
// For Node/Jest environment, require it
const Dexie = self.Dexie || (typeof require !== 'undefined' ? require('dexie') : null);

class TabDatabase extends Dexie {
  constructor() {
    super('EpicTabsDB');

    // Define database schema
    this.version(1).stores({
      tabs: '++id, url, title, sessionId, timestamp, domain, *tags',
      sessions: '++id, name, timestamp, archived',
      settings: 'key',
    });

    // Define table shortcuts
    this.tabs = this.table('tabs');
    this.sessions = this.table('sessions');
    this.settings = this.table('settings');
  }

  /**
   * Initialize the database (for compatibility with old API)
   */
  async init() {
    await this.open();
    return this;
  }

  /**
   * Save a single tab
   */
  async saveTab(tabData) {
    const tab = {
      url: tabData.url,
      title: tabData.title || 'Untitled',
      favIconUrl: tabData.favIconUrl || '',
      sessionId: tabData.sessionId || null,
      timestamp: tabData.timestamp || Date.now(),
      domain: new URL(tabData.url).hostname,
      tags: tabData.tags || [],
      metadata: tabData.metadata || {},
    };

    return await this.tabs.add(tab);
  }

  /**
   * Save multiple tabs at once (batch operation)
   */
  async saveTabs(tabsData) {
    const tabs = tabsData.map((tabData) => ({
      url: tabData.url,
      title: tabData.title || 'Untitled',
      favIconUrl: tabData.favIconUrl || '',
      sessionId: tabData.sessionId || null,
      timestamp: tabData.timestamp || Date.now(),
      domain: new URL(tabData.url).hostname,
      tags: tabData.tags || [],
      metadata: tabData.metadata || {},
    }));

    return await this.tabs.bulkAdd(tabs, { allKeys: true });
  }

  /**
   * Get tabs with filtering and pagination
   */
  async getTabs(options = {}) {
    const {
      sessionId = null,
      domain = null,
      tag = null,
      startDate = null,
      endDate = null,
      limit = 100,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = options;

    let collection;

    // Apply filters
    if (sessionId !== null) {
      collection = this.tabs.where('sessionId').equals(sessionId);
    } else if (domain !== null) {
      collection = this.tabs.where('domain').equals(domain);
    } else if (tag !== null) {
      collection = this.tabs.where('tags').equals(tag);
    } else if (startDate !== null || endDate !== null) {
      if (startDate && endDate) {
        collection = this.tabs.where('timestamp').between(startDate, endDate, true, true);
      } else if (startDate) {
        collection = this.tabs.where('timestamp').aboveOrEqual(startDate);
      } else {
        collection = this.tabs.where('timestamp').belowOrEqual(endDate);
      }
    } else {
      collection = this.tabs.toCollection();
    }

    // Get all matching tabs, then sort and paginate in JavaScript
    const allTabs = await collection.toArray();

    // Sort
    allTabs.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    // Paginate
    return allTabs.slice(offset, offset + limit);
  }

  /**
   * Search tabs by text (searches in title and URL)
   */
  async searchTabs(query, limit = 100) {
    const searchLower = query.toLowerCase();

    return await this.tabs
      .filter(
        (tab) =>
          tab.title.toLowerCase().includes(searchLower) ||
          tab.url.toLowerCase().includes(searchLower)
      )
      .limit(limit)
      .toArray();
  }

  /**
   * Delete a tab by ID
   */
  async deleteTab(tabId) {
    await this.tabs.delete(tabId);
  }

  /**
   * Delete multiple tabs
   */
  async deleteTabs(tabIds) {
    await this.tabs.bulkDelete(tabIds);
  }

  /**
   * Create a new session
   */
  async createSession(name, tabIds = []) {
    const session = {
      name: name || `Session ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      tabIds: tabIds,
      archived: false,
      metadata: {},
    };

    return await this.sessions.add(session);
  }

  /**
   * Get all sessions
   */
  async getSessions(includeArchived = false) {
    let collection;

    if (!includeArchived) {
      collection = this.sessions.where('archived').equals(false);
    } else {
      collection = this.sessions.toCollection();
    }

    // Get all sessions and sort in JavaScript
    const sessions = await collection.toArray();
    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get a session by ID with its tabs
   */
  async getSessionWithTabs(sessionId) {
    const session = await this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Get tabs for this session
    const tabs = await this.tabs.where('sessionId').equals(sessionId).toArray();

    session.tabs = tabs;
    return session;
  }

  /**
   * Update a session
   */
  async updateSession(sessionId, updates) {
    const session = await this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    Object.assign(session, updates);
    await this.sessions.put(session);

    return session;
  }

  /**
   * Delete a session and optionally its tabs
   */
  async deleteSession(sessionId, deleteTabs = false) {
    if (deleteTabs) {
      // Delete all tabs in this session
      await this.tabs.where('sessionId').equals(sessionId).delete();
    }

    // Delete the session
    await this.sessions.delete(sessionId);
  }

  /**
   * Get total count of tabs
   */
  async getTabCount() {
    return await this.tabs.count();
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const [totalTabs, totalSessions] = await Promise.all([
      this.tabs.count(),
      this.sessions.count(),
    ]);

    return {
      totalTabs,
      totalSessions,
    };
  }

  /**
   * Export all data for backup
   */
  async exportData() {
    const [tabs, sessions, settings] = await Promise.all([
      this.tabs.toArray(),
      this.sessions.toArray(),
      this.settings.toArray(),
    ]);

    return {
      tabs,
      sessions,
      settings,
      exportDate: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Import data from backup
   */
  async importData(data) {
    await this.transaction('rw', [this.tabs, this.sessions, this.settings], async () => {
      // Import tabs
      if (data.tabs && data.tabs.length > 0) {
        const tabsToImport = data.tabs.map((tab) => {
          const { id, ...tabData } = tab; // Remove auto-generated ID
          return tabData;
        });
        await this.tabs.bulkAdd(tabsToImport);
      }

      // Import sessions
      if (data.sessions && data.sessions.length > 0) {
        const sessionsToImport = data.sessions.map((session) => {
          const { id, ...sessionData } = session;
          return sessionData;
        });
        await this.sessions.bulkAdd(sessionsToImport);
      }

      // Import settings
      if (data.settings && data.settings.length > 0) {
        await this.settings.bulkPut(data.settings);
      }
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    await this.transaction('rw', [this.tabs, this.sessions], async () => {
      await this.tabs.clear();
      await this.sessions.clear();
    });
  }
}

// Create a singleton instance
const db = new TabDatabase();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TabDatabase, db };
}
