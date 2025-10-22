# Epic Tabs

A powerful Chrome extension for managing, organizing, and restoring hundreds of thousands of browser tabs. Combines the best features of OneTab and SessionBuddy with advanced search and filtering capabilities.

## Features

### Tab Management
- **Save Individual Tabs**: Quickly save the current tab for later
- **Save Window Tabs**: Save all tabs in the current window
- **Save All Tabs**: Save tabs across all windows
- **Auto-close Option**: Optionally close tabs after saving to free up memory

### Session Organization
- **Session Grouping**: Automatically organize saved tabs into named sessions
- **Session Management**: Create, rename, restore, and delete sessions
- **Restore Options**: Restore sessions in current window or new window
- **Session Preview**: View session details and tab counts at a glance

### Advanced Search & Filtering
- **Full-Text Search**: Search across tab titles and URLs
- **Sort Options**: Sort by date (newest/oldest), title (A-Z), or domain
- **Pagination**: Efficiently browse through large collections
- **Real-time Results**: Instant search feedback

### Data Management
- **Export/Import**: Backup and restore all your saved tabs and sessions
- **Unlimited Storage**: Store hundreds of thousands of tabs using IndexedDB
- **Statistics Dashboard**: Track total saved tabs and sessions

### User Interface
- **Quick Access Popup**: Fast actions via browser toolbar
- **Full Manager Page**: Comprehensive interface for browsing and managing tabs
- **Context Menu**: Right-click to save tabs
- **Keyboard Shortcuts**: (Can be configured in chrome://extensions/shortcuts)

## Installation

### From Source
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension` folder from this repository

### From Chrome Web Store
*(Not yet published)*

## Usage

### Saving Tabs

**Via Popup:**
1. Click the Epic Tabs icon in your browser toolbar
2. Choose one of the save options:
   - Save Current Tab
   - Save Window Tabs
   - Save All Tabs
3. Optionally check "Close tabs after saving"

**Via Context Menu:**
1. Right-click on any webpage
2. Select "Save this tab", "Save all tabs", or "Save all tabs in this window"

### Managing Saved Tabs

1. Click the Epic Tabs icon and then "Open Tab Manager"
2. Navigate between views:
   - **Sessions**: Browse saved sessions
   - **All Tabs**: View all saved tabs with sorting options
   - **Search**: Search for specific tabs

### Restoring Tabs

**Restore Individual Tabs:**
- In the manager, click "Restore" next to any tab

**Restore Sessions:**
1. Click on a session card to open details
2. Choose:
   - "Restore All" - Opens in current window
   - "Restore in New Window" - Opens in a new window

### Export/Import

**Export:**
1. Open the Tab Manager
2. Click "Export Data" in the sidebar
3. Save the JSON file to your computer

**Import:**
1. Open the Tab Manager
2. Click "Import Data" in the sidebar
3. Select a previously exported JSON file

## Technical Details

### Storage
- **IndexedDB**: Used for efficient storage of large datasets
- **Chrome Storage Sync**: Used for user preferences
- **Unlimited Storage**: No practical limit on saved tabs

### Data Structure
Each saved tab includes:
- URL
- Title
- Favicon URL
- Timestamp (for sorting and filtering)
- Domain (for filtering)
- Session ID (for grouping)
- Tags (for categorization)
- Custom metadata

### Performance
- **Pagination**: Loads tabs in batches of 50 for optimal performance
- **Indexed Queries**: Fast filtering by date, domain, session, and tags
- **Lazy Loading**: Session details loaded on demand

### Manifest Version
Epic Tabs uses **Manifest V3**, the latest Chrome extension standard.

### Permissions
- `tabs`: Access tab information
- `storage` & `unlimitedStorage`: Store tab data
- `bookmarks` & `history`: Future features
- `activeTab`: Access current tab
- `scripting`: Future content script features
- `tabGroups`: Future tab group integration
- `notifications`: User notifications
- `contextMenus`: Right-click menu options

## Architecture

```
extension/
├── manifest.json           # Extension configuration
├── db.js                  # IndexedDB wrapper
├── background.js          # Service worker (tab operations)
├── popup.html/js          # Quick action popup
├── manager.html/css/js    # Full management interface
└── images/                # Icons and assets
```

### Key Components

**db.js**: IndexedDB wrapper providing:
- Tab storage and retrieval
- Session management
- Search and filtering
- Export/import functionality

**background.js**: Service worker handling:
- Tab capture
- Session creation
- Restoration logic
- Context menu actions
- Keyboard shortcuts

**manager.js**: Full-page interface for:
- Browsing sessions
- Searching tabs
- Managing saved data
- Import/export

## Roadmap

Future features planned:
- [ ] Tag system for custom categorization
- [ ] Scheduled auto-save
- [ ] Tab group integration
- [ ] Cloud sync across devices
- [ ] Duplicate tab detection
- [ ] Advanced filtering (by date range, domain patterns)
- [ ] Tab notes and annotations
- [ ] Quick restore from search results
- [ ] Keyboard shortcuts customization UI

## Privacy

Epic Tabs:
- Stores all data **locally** on your device
- Does **not** send any data to external servers
- Does **not** track your browsing activity
- Export/import files are **entirely under your control**

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

See [LICENSE](LICENSE) file for details.

## Credits

Inspired by:
- [OneTab](https://www.one-tab.com/)
- [SessionBuddy](https://sessionbuddy.com/)
- [RxDB](https://rxdb.info/) for offline-first database concepts

## Support

For issues, feature requests, or questions, please [open an issue](https://github.com/yourusername/chrome-epic-tabs/issues) on GitHub.
