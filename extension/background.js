/**
 * Epic Tabs - Background Service Worker
 * Handles tab capture, session management, and restoration
 */

importScripts('lib/dexie.js', 'db.js');

// Initialize database on startup
let dbReady = false;

db.init().then(() => {
  dbReady = true;
  console.log('Epic Tabs: Database initialized');
}).catch(err => {
  console.error('Epic Tabs: Database initialization failed', err);
});

// Installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Epic Tabs: Extension installed');

  // Set default settings
  chrome.storage.sync.set({
    autoSave: false,
    closeTabsAfterSave: false,
    showNotifications: true
  });

  // Create context menu items
  chrome.contextMenus.create({
    id: 'save-tab',
    title: 'Save this tab',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'save-all-tabs',
    title: 'Save all tabs',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'save-window-tabs',
    title: 'Save all tabs in this window',
    contexts: ['page']
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!dbReady) {
    console.error('Database not ready');
    return;
  }

  switch (info.menuItemId) {
    case 'save-tab':
      await saveCurrentTab(tab);
      break;
    case 'save-all-tabs':
      await saveAllTabs();
      break;
    case 'save-window-tabs':
      await saveWindowTabs(tab.windowId);
      break;
  }
});

// Message handler for popup and manager page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!dbReady) {
    sendResponse({ success: false, error: 'Database not ready' });
    return true;
  }

  handleMessage(request, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true; // Keep message channel open for async response
});

async function handleMessage(request, sender) {
  const { action, data } = request;

  switch (action) {
    case 'saveCurrentTab':
      return await saveCurrentTab();

    case 'saveAllTabs':
      return await saveAllTabs(data?.closeAfterSave);

    case 'saveWindowTabs':
      return await saveWindowTabs(data?.windowId, data?.closeAfterSave);

    case 'saveTabs':
      return await saveTabs(data.tabs, data.sessionName, data.closeAfterSave);

    case 'restoreTab':
      return await restoreTab(data.tabData);

    case 'restoreTabs':
      return await restoreTabs(data.tabs, data.inNewWindow);

    case 'restoreSession':
      return await restoreSession(data.sessionId, data.inNewWindow);

    case 'deleteTab':
      await db.deleteTab(data.tabId);
      return { success: true };

    case 'deleteTabs':
      await db.deleteTabs(data.tabIds);
      return { success: true };

    case 'deleteSession':
      await db.deleteSession(data.sessionId, data.deleteTabs);
      return { success: true };

    case 'getTabs':
      const tabs = await db.getTabs(data);
      return { success: true, tabs };

    case 'searchTabs':
      const results = await db.searchTabs(data.query, data.limit);
      return { success: true, tabs: results };

    case 'getSessions':
      const sessions = await db.getSessions(data?.includeArchived);
      return { success: true, sessions };

    case 'getSession':
      const session = await db.getSessionWithTabs(data.sessionId);
      return { success: true, session };

    case 'updateSession':
      const updatedSession = await db.updateSession(data.sessionId, data.updates);
      return { success: true, session: updatedSession };

    case 'getStats':
      const stats = await db.getStats();
      return { success: true, stats };

    case 'exportData':
      const exportData = await db.exportData();
      return { success: true, data: exportData };

    case 'importData':
      await db.importData(data);
      return { success: true };

    case 'clearAll':
      await db.clearAll();
      return { success: true };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Save the current active tab
 */
async function saveCurrentTab(tab) {
  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  }

  if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return { success: false, error: 'Cannot save chrome:// or extension pages' };
  }

  const tabId = await db.saveTab({
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    timestamp: Date.now()
  });

  showNotification('Tab Saved', `"${tab.title}" has been saved`);

  return { success: true, tabId };
}

/**
 * Save all tabs across all windows
 */
async function saveAllTabs(closeAfterSave = false) {
  const allTabs = await chrome.tabs.query({});
  const sessionName = `All Tabs - ${new Date().toLocaleString()}`;

  return await saveTabs(allTabs, sessionName, closeAfterSave);
}

/**
 * Save all tabs in a specific window
 */
async function saveWindowTabs(windowId, closeAfterSave = false) {
  if (!windowId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    windowId = activeTab.windowId;
  }

  const windowTabs = await chrome.tabs.query({ windowId });
  const sessionName = `Window Tabs - ${new Date().toLocaleString()}`;

  return await saveTabs(windowTabs, sessionName, closeAfterSave);
}

/**
 * Save a collection of tabs as a session
 */
async function saveTabs(tabs, sessionName, closeAfterSave = false) {
  // Filter out chrome:// and extension pages
  const validTabs = tabs.filter(tab =>
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('chrome-extension://')
  );

  if (validTabs.length === 0) {
    return { success: false, error: 'No valid tabs to save' };
  }

  // Create session first
  const sessionId = await db.createSession(sessionName);

  // Prepare tab data
  const tabsData = validTabs.map(tab => ({
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    sessionId: sessionId,
    timestamp: Date.now()
  }));

  // Save all tabs
  const tabIds = await db.saveTabs(tabsData);

  // Close tabs if requested
  if (closeAfterSave) {
    const tabIdsToClose = validTabs.map(t => t.id);
    await chrome.tabs.remove(tabIdsToClose);
  }

  showNotification(
    'Session Saved',
    `Saved ${validTabs.length} tab${validTabs.length !== 1 ? 's' : ''} to "${sessionName}"`
  );

  return {
    success: true,
    sessionId,
    tabIds,
    count: validTabs.length
  };
}

/**
 * Restore a single tab
 */
async function restoreTab(tabData) {
  const newTab = await chrome.tabs.create({
    url: tabData.url,
    active: false
  });

  return { success: true, tab: newTab };
}

/**
 * Restore multiple tabs
 */
async function restoreTabs(tabs, inNewWindow = false) {
  if (tabs.length === 0) {
    return { success: false, error: 'No tabs to restore' };
  }

  if (inNewWindow) {
    // Create new window with first tab
    const window = await chrome.windows.create({
      url: tabs[0].url,
      focused: true
    });

    // Add remaining tabs to the new window
    for (let i = 1; i < tabs.length; i++) {
      await chrome.tabs.create({
        windowId: window.id,
        url: tabs[i].url,
        active: false
      });
    }

    return { success: true, windowId: window.id, count: tabs.length };
  } else {
    // Restore in current window
    for (const tab of tabs) {
      await chrome.tabs.create({
        url: tab.url,
        active: false
      });
    }

    return { success: true, count: tabs.length };
  }
}

/**
 * Restore an entire session
 */
async function restoreSession(sessionId, inNewWindow = false) {
  const session = await db.getSessionWithTabs(sessionId);

  if (!session || !session.tabs || session.tabs.length === 0) {
    return { success: false, error: 'Session not found or has no tabs' };
  }

  const result = await restoreTabs(session.tabs, inNewWindow);

  if (result.success) {
    showNotification(
      'Session Restored',
      `Restored ${result.count} tab${result.count !== 1 ? 's' : ''} from "${session.name}"`
    );
  }

  return result;
}

/**
 * Show a browser notification
 */
async function showNotification(title, message) {
  const settings = await chrome.storage.sync.get('showNotifications');

  if (settings.showNotifications !== false) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/images/get_started128.png',
      title: title,
      message: message,
      priority: 1
    });
  }
}

// Keyboard shortcuts handler
chrome.commands.onCommand.addListener(async (command) => {
  if (!dbReady) return;

  switch (command) {
    case 'save-all-tabs':
      await saveAllTabs(false);
      break;
    case 'save-and-close-all-tabs':
      await saveAllTabs(true);
      break;
    case 'save-current-tab':
      await saveCurrentTab();
      break;
  }
});

console.log('Epic Tabs: Background service worker loaded');
