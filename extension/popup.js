/**
 * Epic Tabs - Popup Script
 * Handles quick tab save/restore actions
 */

// Elements
const saveCurrentTabBtn = document.getElementById('saveCurrentTab');
const saveWindowTabsBtn = document.getElementById('saveWindowTabs');
const saveAllTabsBtn = document.getElementById('saveAllTabs');
const openManagerBtn = document.getElementById('openManager');
const closeAfterSaveCheckbox = document.getElementById('closeAfterSave');
const tabCountEl = document.getElementById('tabCount');
const sessionCountEl = document.getElementById('sessionCount');

// Load stats on popup open
loadStats();

// Load saved preference for close after save
chrome.storage.sync.get('closeTabsAfterSave', (data) => {
  closeAfterSaveCheckbox.checked = data.closeTabsAfterSave || false;
});

// Save preference when checkbox changes
closeAfterSaveCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ closeTabsAfterSave: closeAfterSaveCheckbox.checked });
});

// Button click handlers
saveCurrentTabBtn.addEventListener('click', async () => {
  setButtonLoading(saveCurrentTabBtn, true);
  try {
    const response = await sendMessage({ action: 'saveCurrentTab' });
    if (response.success) {
      showSuccess(saveCurrentTabBtn);
      loadStats();
    } else {
      showError(saveCurrentTabBtn);
      console.error('Failed to save tab:', response.error);
    }
  } catch (error) {
    showError(saveCurrentTabBtn);
    console.error('Error saving tab:', error);
  }
  setButtonLoading(saveCurrentTabBtn, false);
});

saveWindowTabsBtn.addEventListener('click', async () => {
  setButtonLoading(saveWindowTabsBtn, true);
  try {
    const response = await sendMessage({
      action: 'saveWindowTabs',
      data: { closeAfterSave: closeAfterSaveCheckbox.checked }
    });
    if (response.success) {
      showSuccess(saveWindowTabsBtn);
      loadStats();
      if (closeAfterSaveCheckbox.checked) {
        window.close();
      }
    } else {
      showError(saveWindowTabsBtn);
      console.error('Failed to save window tabs:', response.error);
    }
  } catch (error) {
    showError(saveWindowTabsBtn);
    console.error('Error saving window tabs:', error);
  }
  setButtonLoading(saveWindowTabsBtn, false);
});

saveAllTabsBtn.addEventListener('click', async () => {
  setButtonLoading(saveAllTabsBtn, true);
  try {
    const response = await sendMessage({
      action: 'saveAllTabs',
      data: { closeAfterSave: closeAfterSaveCheckbox.checked }
    });
    if (response.success) {
      showSuccess(saveAllTabsBtn);
      loadStats();
      if (closeAfterSaveCheckbox.checked) {
        window.close();
      }
    } else {
      showError(saveAllTabsBtn);
      console.error('Failed to save all tabs:', response.error);
    }
  } catch (error) {
    showError(saveAllTabsBtn);
    console.error('Error saving all tabs:', error);
  }
  setButtonLoading(saveAllTabsBtn, false);
});

openManagerBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
  window.close();
});

/**
 * Load and display statistics
 */
async function loadStats() {
  try {
    const response = await sendMessage({ action: 'getStats' });
    if (response.success) {
      tabCountEl.textContent = formatNumber(response.stats.totalTabs || 0);
      sessionCountEl.textContent = formatNumber(response.stats.totalSessions || 0);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    tabCountEl.textContent = '-';
    sessionCountEl.textContent = '-';
  }
}

/**
 * Send a message to the background script
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
 * Set button loading state
 */
function setButtonLoading(button, loading) {
  if (loading) {
    button.disabled = true;
    button.style.opacity = '0.6';
  } else {
    button.disabled = false;
    button.style.opacity = '1';
  }
}

/**
 * Show success feedback on button
 */
function showSuccess(button) {
  const originalBg = button.style.background;
  button.style.background = '#3aa757';
  setTimeout(() => {
    button.style.background = originalBg;
  }, 500);
}

/**
 * Show error feedback on button
 */
function showError(button) {
  const originalBg = button.style.background;
  button.style.background = '#e8453c';
  setTimeout(() => {
    button.style.background = originalBg;
  }, 500);
}

/**
 * Format large numbers with commas
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
