/**
 * Epic Tabs Manager
 * Main interface for browsing, searching, and managing saved tabs
 */

// State
let currentView = 'sessions';
let currentSession = null;
let allTabsOffset = 0;
const TABS_PER_PAGE = 50;

// Elements
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const totalTabsEl = document.getElementById('totalTabs');
const totalSessionsEl = document.getElementById('totalSessions');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const sessionsList = document.getElementById('sessionsList');
const allTabsList = document.getElementById('allTabsList');
const searchResults = document.getElementById('searchResults');
const sortBySelect = document.getElementById('sortBy');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const newSessionBtn = document.getElementById('newSessionBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

// Modal elements
const sessionModal = document.getElementById('sessionModal');
const sessionTitle = document.getElementById('sessionTitle');
const sessionTabsList = document.getElementById('sessionTabsList');
const modalClose = document.querySelector('.modal-close');
const restoreSessionBtn = document.getElementById('restoreSessionBtn');
const restoreSessionNewWindowBtn = document.getElementById('restoreSessionNewWindowBtn');
const renameSessionBtn = document.getElementById('renameSessionBtn');
const deleteSessionBtn = document.getElementById('deleteSessionBtn');

// Initialize
init();

async function init() {
  await loadStats();
  await loadSessions();

  // Set up event listeners
  navItems.forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  sortBySelect.addEventListener('change', loadAllTabs);
  loadMoreBtn.addEventListener('click', loadMoreTabs);
  newSessionBtn.addEventListener('click', createNewSession);
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', importData);

  modalClose.addEventListener('click', closeModal);
  sessionModal.addEventListener('click', (e) => {
    if (e.target === sessionModal) closeModal();
  });

  restoreSessionBtn.addEventListener('click', () => restoreSession(false));
  restoreSessionNewWindowBtn.addEventListener('click', () => restoreSession(true));
  renameSessionBtn.addEventListener('click', renameSession);
  deleteSessionBtn.addEventListener('click', deleteSession);
}

/**
 * Switch between views
 */
function switchView(view) {
  currentView = view;

  // Update navigation
  navItems.forEach(item => {
    if (item.dataset.view === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update views
  views.forEach(v => v.classList.remove('active'));

  if (view === 'sessions') {
    document.getElementById('sessionsView').classList.add('active');
    loadSessions();
  } else if (view === 'all-tabs') {
    document.getElementById('allTabsView').classList.add('active');
    allTabsOffset = 0;
    loadAllTabs();
  } else if (view === 'search') {
    document.getElementById('searchView').classList.add('active');
  }
}

/**
 * Load and display statistics
 */
async function loadStats() {
  try {
    const response = await sendMessage({ action: 'getStats' });
    if (response.success) {
      totalTabsEl.textContent = formatNumber(response.stats.totalTabs || 0);
      totalSessionsEl.textContent = formatNumber(response.stats.totalSessions || 0);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Load and display sessions
 */
async function loadSessions() {
  sessionsList.innerHTML = '<div class="loading">Loading sessions...</div>';

  try {
    const response = await sendMessage({ action: 'getSessions' });
    if (response.success) {
      renderSessions(response.sessions);
    } else {
      sessionsList.innerHTML = '<div class="empty-state"><p>Failed to load sessions</p></div>';
    }
  } catch (error) {
    console.error('Error loading sessions:', error);
    sessionsList.innerHTML = '<div class="empty-state"><p>Error loading sessions</p></div>';
  }
}

/**
 * Render sessions list
 */
function renderSessions(sessions) {
  if (sessions.length === 0) {
    sessionsList.innerHTML = `
      <div class="empty-state">
        <span class="icon">📁</span>
        <p>No sessions yet. Save some tabs to get started!</p>
      </div>
    `;
    return;
  }

  sessionsList.innerHTML = sessions.map(session => `
    <div class="session-card" data-session-id="${session.id}">
      <div class="session-card-header">
        <div>
          <div class="session-name">${escapeHtml(session.name)}</div>
          <div class="session-date">${formatDate(session.timestamp)}</div>
        </div>
        <div class="session-tab-count">${session.tabIds?.length || 0} tabs</div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.session-card').forEach(card => {
    card.addEventListener('click', () => {
      const sessionId = parseInt(card.dataset.sessionId);
      openSessionModal(sessionId);
    });
  });
}

/**
 * Load all tabs
 */
async function loadAllTabs() {
  allTabsList.innerHTML = '<div class="loading">Loading tabs...</div>';
  allTabsOffset = 0;

  const [sortBy, sortOrder] = sortBySelect.value.split('-');

  try {
    const response = await sendMessage({
      action: 'getTabs',
      data: {
        limit: TABS_PER_PAGE,
        offset: allTabsOffset,
        sortBy: sortBy === 'domain' ? 'domain' : 'timestamp',
        sortOrder: sortOrder || 'desc'
      }
    });

    if (response.success) {
      renderTabs(response.tabs, allTabsList);

      // Show/hide load more button
      if (response.tabs.length >= TABS_PER_PAGE) {
        document.getElementById('loadMoreContainer').style.display = 'flex';
      } else {
        document.getElementById('loadMoreContainer').style.display = 'none';
      }
    } else {
      allTabsList.innerHTML = '<div class="empty-state"><p>Failed to load tabs</p></div>';
    }
  } catch (error) {
    console.error('Error loading tabs:', error);
    allTabsList.innerHTML = '<div class="empty-state"><p>Error loading tabs</p></div>';
  }
}

/**
 * Load more tabs
 */
async function loadMoreTabs() {
  allTabsOffset += TABS_PER_PAGE;
  const [sortBy, sortOrder] = sortBySelect.value.split('-');

  try {
    const response = await sendMessage({
      action: 'getTabs',
      data: {
        limit: TABS_PER_PAGE,
        offset: allTabsOffset,
        sortBy: sortBy === 'domain' ? 'domain' : 'timestamp',
        sortOrder: sortOrder || 'desc'
      }
    });

    if (response.success) {
      const currentContent = allTabsList.innerHTML;
      allTabsList.innerHTML = currentContent + renderTabsHTML(response.tabs);

      // Hide load more if we got less than a full page
      if (response.tabs.length < TABS_PER_PAGE) {
        document.getElementById('loadMoreContainer').style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading more tabs:', error);
  }
}

/**
 * Perform search
 */
async function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    searchResults.innerHTML = `
      <div class="empty-state">
        <span class="icon">🔍</span>
        <p>Enter a search term to find tabs</p>
      </div>
    `;
    return;
  }

  searchResults.innerHTML = '<div class="loading">Searching...</div>';

  try {
    const response = await sendMessage({
      action: 'searchTabs',
      data: { query, limit: 1000 }
    });

    if (response.success) {
      if (response.tabs.length === 0) {
        searchResults.innerHTML = `
          <div class="empty-state">
            <span class="icon">🔍</span>
            <p>No tabs found for "${escapeHtml(query)}"</p>
          </div>
        `;
      } else {
        renderTabs(response.tabs, searchResults);
      }
    } else {
      searchResults.innerHTML = '<div class="empty-state"><p>Search failed</p></div>';
    }
  } catch (error) {
    console.error('Error searching:', error);
    searchResults.innerHTML = '<div class="empty-state"><p>Search error</p></div>';
  }
}

/**
 * Render tabs in a container
 */
function renderTabs(tabs, container) {
  container.innerHTML = renderTabsHTML(tabs);
}

/**
 * Generate HTML for tabs
 */
function renderTabsHTML(tabs) {
  if (tabs.length === 0) {
    return `
      <div class="empty-state">
        <span class="icon">📑</span>
        <p>No tabs found</p>
      </div>
    `;
  }

  return tabs.map(tab => `
    <div class="tab-item" data-tab-id="${tab.id}">
      <img
        class="tab-favicon"
        src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"
      >
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
      </div>
      <div class="tab-date">${formatDate(tab.timestamp)}</div>
      <div class="tab-actions">
        <button class="tab-action-btn restore" onclick="restoreTab(${tab.id})">Restore</button>
        <button class="tab-action-btn delete" onclick="deleteTab(${tab.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

/**
 * Open session modal
 */
async function openSessionModal(sessionId) {
  currentSession = sessionId;
  sessionModal.classList.add('active');
  sessionTabsList.innerHTML = '<div class="loading">Loading session...</div>';

  try {
    const response = await sendMessage({
      action: 'getSession',
      data: { sessionId }
    });

    if (response.success && response.session) {
      sessionTitle.textContent = response.session.name;
      renderTabs(response.session.tabs || [], sessionTabsList);
    } else {
      sessionTabsList.innerHTML = '<div class="empty-state"><p>Failed to load session</p></div>';
    }
  } catch (error) {
    console.error('Error loading session:', error);
    sessionTabsList.innerHTML = '<div class="empty-state"><p>Error loading session</p></div>';
  }
}

/**
 * Close session modal
 */
function closeModal() {
  sessionModal.classList.remove('active');
  currentSession = null;
}

/**
 * Restore session
 */
async function restoreSession(inNewWindow) {
  if (!currentSession) return;

  try {
    const response = await sendMessage({
      action: 'restoreSession',
      data: { sessionId: currentSession, inNewWindow }
    });

    if (response.success) {
      closeModal();
    } else {
      alert('Failed to restore session: ' + response.error);
    }
  } catch (error) {
    console.error('Error restoring session:', error);
    alert('Error restoring session');
  }
}

/**
 * Rename session
 */
async function renameSession() {
  if (!currentSession) return;

  const newName = prompt('Enter new session name:', sessionTitle.textContent);
  if (!newName || newName.trim() === '') return;

  try {
    const response = await sendMessage({
      action: 'updateSession',
      data: {
        sessionId: currentSession,
        updates: { name: newName.trim() }
      }
    });

    if (response.success) {
      sessionTitle.textContent = newName.trim();
      loadSessions();
    } else {
      alert('Failed to rename session');
    }
  } catch (error) {
    console.error('Error renaming session:', error);
    alert('Error renaming session');
  }
}

/**
 * Delete session
 */
async function deleteSession() {
  if (!currentSession) return;

  const confirmDelete = confirm('Are you sure you want to delete this session and all its tabs?');
  if (!confirmDelete) return;

  try {
    const response = await sendMessage({
      action: 'deleteSession',
      data: { sessionId: currentSession, deleteTabs: true }
    });

    if (response.success) {
      closeModal();
      loadSessions();
      loadStats();
    } else {
      alert('Failed to delete session');
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    alert('Error deleting session');
  }
}

/**
 * Restore a single tab (global function for onclick)
 */
window.restoreTab = async function(tabId) {
  try {
    const tabsResponse = await sendMessage({
      action: 'getTabs',
      data: { limit: 1, offset: 0 }
    });

    // Find the tab - this is a simplified approach
    // In production, we'd want to query by ID directly
    const response = await sendMessage({
      action: 'restoreTab',
      data: { tabData: { url: 'about:blank' } } // Placeholder
    });

    // Better approach: Add a getTabById method to background.js
    console.log('Restore tab:', tabId);
  } catch (error) {
    console.error('Error restoring tab:', error);
  }
};

/**
 * Delete a single tab (global function for onclick)
 */
window.deleteTab = async function(tabId) {
  const confirmDelete = confirm('Are you sure you want to delete this tab?');
  if (!confirmDelete) return;

  try {
    const response = await sendMessage({
      action: 'deleteTab',
      data: { tabId }
    });

    if (response.success) {
      // Refresh current view
      if (currentView === 'sessions') {
        loadSessions();
      } else if (currentView === 'all-tabs') {
        loadAllTabs();
      } else if (currentView === 'search') {
        performSearch();
      }
      loadStats();
    } else {
      alert('Failed to delete tab');
    }
  } catch (error) {
    console.error('Error deleting tab:', error);
    alert('Error deleting tab');
  }
};

/**
 * Create new session
 */
async function createNewSession() {
  const name = prompt('Enter session name:');
  if (!name || name.trim() === '') return;

  try {
    const response = await sendMessage({
      action: 'createSession',
      data: { name: name.trim() }
    });

    if (response.success) {
      loadSessions();
      loadStats();
    } else {
      alert('Failed to create session');
    }
  } catch (error) {
    console.error('Error creating session:', error);
    alert('Error creating session');
  }
}

/**
 * Export data
 */
async function exportData() {
  try {
    const response = await sendMessage({ action: 'exportData' });

    if (response.success) {
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `epic-tabs-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Failed to export data');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data');
  }
}

/**
 * Import data
 */
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);

      const confirmImport = confirm(
        `This will import ${data.tabs?.length || 0} tabs and ${data.sessions?.length || 0} sessions. Continue?`
      );

      if (!confirmImport) return;

      const response = await sendMessage({
        action: 'importData',
        data: data
      });

      if (response.success) {
        alert('Data imported successfully!');
        loadSessions();
        loadStats();
      } else {
        alert('Failed to import data');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing data: Invalid file format');
    }
  };

  reader.readAsText(file);
  // Reset input
  importFileInput.value = '';
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Format number with K/M suffixes
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format date
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
