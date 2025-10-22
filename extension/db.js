/**
 * IndexedDB wrapper for efficient storage of hundreds of thousands of tabs
 */

const DB_NAME = 'EpicTabsDB';
const DB_VERSION = 1;

class TabDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for individual tabs
        if (!db.objectStoreNames.contains('tabs')) {
          const tabStore = db.createObjectStore('tabs', { keyPath: 'id', autoIncrement: true });
          tabStore.createIndex('url', 'url', { unique: false });
          tabStore.createIndex('title', 'title', { unique: false });
          tabStore.createIndex('sessionId', 'sessionId', { unique: false });
          tabStore.createIndex('timestamp', 'timestamp', { unique: false });
          tabStore.createIndex('domain', 'domain', { unique: false });
          tabStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Store for sessions/groups
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          sessionStore.createIndex('name', 'name', { unique: false });
          sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
          sessionStore.createIndex('archived', 'archived', { unique: false });
        }

        // Store for settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save a single tab
   */
  async saveTab(tabData) {
    const transaction = this.db.transaction(['tabs'], 'readwrite');
    const store = transaction.objectStore('tabs');

    const tab = {
      url: tabData.url,
      title: tabData.title || 'Untitled',
      favIconUrl: tabData.favIconUrl || '',
      sessionId: tabData.sessionId || null,
      timestamp: tabData.timestamp || Date.now(),
      domain: new URL(tabData.url).hostname,
      tags: tabData.tags || [],
      metadata: tabData.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const request = store.add(tab);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save multiple tabs at once (batch operation)
   */
  async saveTabs(tabsData) {
    const transaction = this.db.transaction(['tabs'], 'readwrite');
    const store = transaction.objectStore('tabs');
    const ids = [];

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(ids);
      transaction.onerror = () => reject(transaction.error);

      tabsData.forEach(tabData => {
        const tab = {
          url: tabData.url,
          title: tabData.title || 'Untitled',
          favIconUrl: tabData.favIconUrl || '',
          sessionId: tabData.sessionId || null,
          timestamp: tabData.timestamp || Date.now(),
          domain: new URL(tabData.url).hostname,
          tags: tabData.tags || [],
          metadata: tabData.metadata || {}
        };

        const request = store.add(tab);
        request.onsuccess = () => ids.push(request.result);
      });
    });
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
      sortOrder = 'desc'
    } = options;

    const transaction = this.db.transaction(['tabs'], 'readonly');
    const store = transaction.objectStore('tabs');
    let index;
    let range;

    // Select appropriate index based on filters
    if (sessionId !== null) {
      index = store.index('sessionId');
      range = IDBKeyRange.only(sessionId);
    } else if (domain !== null) {
      index = store.index('domain');
      range = IDBKeyRange.only(domain);
    } else if (tag !== null) {
      index = store.index('tags');
      range = IDBKeyRange.only(tag);
    } else if (startDate !== null || endDate !== null) {
      index = store.index('timestamp');
      if (startDate && endDate) {
        range = IDBKeyRange.bound(startDate, endDate);
      } else if (startDate) {
        range = IDBKeyRange.lowerBound(startDate);
      } else {
        range = IDBKeyRange.upperBound(endDate);
      }
    } else {
      index = store.index(sortBy);
    }

    return new Promise((resolve, reject) => {
      const results = [];
      const direction = sortOrder === 'desc' ? 'prev' : 'next';
      const request = range ? index.openCursor(range, direction) : index.openCursor(null, direction);
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
          } else {
            results.push(cursor.value);
            cursor.continue();
          }
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search tabs by text (searches in title and URL)
   */
  async searchTabs(query, limit = 100) {
    const transaction = this.db.transaction(['tabs'], 'readonly');
    const store = transaction.objectStore('tabs');

    return new Promise((resolve, reject) => {
      const results = [];
      const request = store.openCursor();
      const searchLower = query.toLowerCase();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          const tab = cursor.value;
          const titleMatch = tab.title.toLowerCase().includes(searchLower);
          const urlMatch = tab.url.toLowerCase().includes(searchLower);

          if (titleMatch || urlMatch) {
            results.push(tab);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a tab by ID
   */
  async deleteTab(tabId) {
    const transaction = this.db.transaction(['tabs'], 'readwrite');
    const store = transaction.objectStore('tabs');

    return new Promise((resolve, reject) => {
      const request = store.delete(tabId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete multiple tabs
   */
  async deleteTabs(tabIds) {
    const transaction = this.db.transaction(['tabs'], 'readwrite');
    const store = transaction.objectStore('tabs');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      tabIds.forEach(id => {
        store.delete(id);
      });
    });
  }

  /**
   * Create a new session
   */
  async createSession(name, tabIds = []) {
    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');

    const session = {
      name: name || `Session ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      tabIds: tabIds,
      archived: false,
      metadata: {}
    };

    return new Promise((resolve, reject) => {
      const request = store.add(session);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all sessions
   */
  async getSessions(includeArchived = false) {
    const transaction = this.db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const results = [];
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (includeArchived || !cursor.value.archived) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a session by ID with its tabs
   */
  async getSessionWithTabs(sessionId) {
    const transaction = this.db.transaction(['sessions', 'tabs'], 'readonly');
    const sessionStore = transaction.objectStore('sessions');
    const tabStore = transaction.objectStore('tabs');
    const tabIndex = tabStore.index('sessionId');

    return new Promise((resolve, reject) => {
      const sessionRequest = sessionStore.get(sessionId);

      sessionRequest.onsuccess = () => {
        const session = sessionRequest.result;
        if (!session) {
          resolve(null);
          return;
        }

        const tabsRequest = tabIndex.getAll(sessionId);
        tabsRequest.onsuccess = () => {
          session.tabs = tabsRequest.result;
          resolve(session);
        };
        tabsRequest.onerror = () => reject(tabsRequest.error);
      };

      sessionRequest.onerror = () => reject(sessionRequest.error);
    });
  }

  /**
   * Update a session
   */
  async updateSession(sessionId, updates) {
    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(sessionId);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (!session) {
          reject(new Error('Session not found'));
          return;
        }

        Object.assign(session, updates);
        const putRequest = store.put(session);
        putRequest.onsuccess = () => resolve(session);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete a session and optionally its tabs
   */
  async deleteSession(sessionId, deleteTabs = false) {
    const stores = deleteTabs ? ['sessions', 'tabs'] : ['sessions'];
    const transaction = this.db.transaction(stores, 'readwrite');
    const sessionStore = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      if (deleteTabs) {
        const tabStore = transaction.objectStore('tabs');
        const tabIndex = tabStore.index('sessionId');
        const tabRequest = tabIndex.openCursor(IDBKeyRange.only(sessionId));

        tabRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }

      sessionStore.delete(sessionId);
    });
  }

  /**
   * Get total count of tabs
   */
  async getTabCount() {
    const transaction = this.db.transaction(['tabs'], 'readonly');
    const store = transaction.objectStore('tabs');

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const transaction = this.db.transaction(['tabs', 'sessions'], 'readonly');
    const tabStore = transaction.objectStore('tabs');
    const sessionStore = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
      const stats = {};

      const tabCountRequest = tabStore.count();
      tabCountRequest.onsuccess = () => {
        stats.totalTabs = tabCountRequest.result;

        const sessionCountRequest = sessionStore.count();
        sessionCountRequest.onsuccess = () => {
          stats.totalSessions = sessionCountRequest.result;
          resolve(stats);
        };
        sessionCountRequest.onerror = () => reject(sessionCountRequest.error);
      };
      tabCountRequest.onerror = () => reject(tabCountRequest.error);
    });
  }

  /**
   * Export all data for backup
   */
  async exportData() {
    const transaction = this.db.transaction(['tabs', 'sessions', 'settings'], 'readonly');
    const data = {
      tabs: [],
      sessions: [],
      settings: [],
      exportDate: new Date().toISOString(),
      version: DB_VERSION
    };

    return new Promise((resolve, reject) => {
      const tabStore = transaction.objectStore('tabs');
      const sessionStore = transaction.objectStore('sessions');
      const settingsStore = transaction.objectStore('settings');

      const tabRequest = tabStore.getAll();
      tabRequest.onsuccess = () => {
        data.tabs = tabRequest.result;

        const sessionRequest = sessionStore.getAll();
        sessionRequest.onsuccess = () => {
          data.sessions = sessionRequest.result;

          const settingsRequest = settingsStore.getAll();
          settingsRequest.onsuccess = () => {
            data.settings = settingsRequest.result;
            resolve(data);
          };
          settingsRequest.onerror = () => reject(settingsRequest.error);
        };
        sessionRequest.onerror = () => reject(sessionRequest.error);
      };
      tabRequest.onerror = () => reject(tabRequest.error);
    });
  }

  /**
   * Import data from backup
   */
  async importData(data) {
    const transaction = this.db.transaction(['tabs', 'sessions', 'settings'], 'readwrite');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const tabStore = transaction.objectStore('tabs');
      const sessionStore = transaction.objectStore('sessions');
      const settingsStore = transaction.objectStore('settings');

      // Import tabs
      if (data.tabs) {
        data.tabs.forEach(tab => {
          const { id, ...tabData } = tab; // Remove auto-generated ID
          tabStore.add(tabData);
        });
      }

      // Import sessions
      if (data.sessions) {
        data.sessions.forEach(session => {
          const { id, ...sessionData } = session;
          sessionStore.add(sessionData);
        });
      }

      // Import settings
      if (data.settings) {
        data.settings.forEach(setting => {
          settingsStore.put(setting);
        });
      }
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    const transaction = this.db.transaction(['tabs', 'sessions'], 'readwrite');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore('tabs').clear();
      transaction.objectStore('sessions').clear();
    });
  }
}

// Create a singleton instance
const db = new TabDatabase();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TabDatabase, db };
}
