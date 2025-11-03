const { app, WebContentsView, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = !app.isPackaged;

  // 1. Load Angular toolbar into main window
  if (isDev) {
    win.loadURL('http://localhost:4200');
  } else {
    // ✅ FIX: Angular outputs to dist/browser-template/browser/
    win.loadFile(path.join(__dirname, 'dist', 'browser-template', 'browser', 'index.html'));
  }

  // 2. Find T-Rex HTML (dev and packaged paths)
  function findTrexIndex() {
    if (isDev) {
      return path.join(__dirname, 'src', 'assets', 'trex', 'index.html');
    }

    // ✅ FIX: Add /browser/ to all packaged paths
    const candidates = [
      path.join(__dirname, 'dist', 'browser-template', 'browser', 'assets', 'trex', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'browser-template', 'browser', 'assets', 'trex', 'index.html'),
      path.join(process.resourcesPath, 'app', 'dist', 'browser-template', 'browser', 'assets', 'trex', 'index.html')
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        console.log('[T-Rex] Found at:', candidate);
        return candidate;
      }
    }

    console.error('[T-Rex] Not found. Tried:', candidates);
    return null;
  }

  const trexPath = findTrexIndex();
  
  if (!trexPath) {
    console.error('[T-Rex] FATAL: Cannot find trex/index.html');
  }

  // 3. Create BrowserView for web content
  const view = new WebContentsView();
  win.contentView.addChildView(view);

  function fitViewToWin() {
    const [width, height] = win.getContentSize();
    const toolbarHeight = 64;
    view.setBounds({ x: 0, y: toolbarHeight, width, height: height - toolbarHeight });
  }

  // 4. Listen for navigation events to sync address bar
  view.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
    if (isMainFrame) win.webContents.send('navigation-started', url);
  });

  // 5. Load T-Rex on fail
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && trexPath) {
      const current = view.webContents.getURL() || '';
      if (!current.includes('trex/index.html')) {
        console.log('[T-Rex] Loading offline game');
        view.webContents.loadFile(trexPath).catch(err => console.error('[T-Rex] Load failed:', err));
      }
    }
  });

  // 6. Check online status
  async function isOnline() {
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD', cache: 'no-cache' });
      return response.ok;
    } catch { return false; }
  }

  // 7. Load URL with fallback
  async function loadURLWithFallback(url) {
    const online = await isOnline();
    if (online) {
      try { await view.webContents.loadURL(url); return; }
      catch (err) { console.error('[Navigation] Failed:', err); }
    }
    if (trexPath) {
      console.log('[T-Rex] Loading offline game');
      await view.webContents.loadFile(trexPath).catch(err => console.error('[T-Rex] Fallback failed:', err));
    }
  }

  // 8. Setup and initial load
  win.once('ready-to-show', () => {
    fitViewToWin();
    loadURLWithFallback('https://amiens.unilasalle.fr');
  });

  win.on('resized', fitViewToWin);

  // 9. IPC handlers
  ipcMain.on('toogle-dev-tool', () => view.webContents.toggleDevTools());
  ipcMain.on('go-back', () => view.webContents.goBack());
  ipcMain.on('go-forward', () => view.webContents.goForward());
  ipcMain.on('refresh', () => view.webContents.reload());
  ipcMain.handle('can-go-forward', () => view.webContents.canGoForward());
  ipcMain.handle('can-go-back', () => view.webContents.canGoBack());
  ipcMain.handle('current-url', () => view.webContents.getURL());
  ipcMain.handle('go-to-page', async (event, url) => await loadURLWithFallback(url));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});