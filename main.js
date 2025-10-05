const { app, WebContentsView, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs'); // Keep fs for the T-Rex fallback, though not strictly needed here

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 1. Load the Angular Toolbar into the Main Window (win)
  if (app.isPackaged) {
    win.loadFile('dist/browser-template/browser/index.html');
  } else {
    win.loadURL('http://localhost:4200');
  }

  // Path to your T-Rex game (local HTML file)
  const trexPath = path.join(__dirname, 'trex', 'index.html');

  // WebContentsView = browser view
  const view = new WebContentsView();
  win.contentView.addChildView(view);

  // Fit browser view into the window (under toolbar)
  function fitViewToWin() {
    // NOTE: Use win.getBounds() instead of win.webContents.getOwnerBrowserWindow().getBounds()
    // getBounds() is cleaner on the BrowserWindow instance.
    const winSize = win.getBounds();
    // The WebContentsView starts at y=55 (below the toolbar) and takes the rest of the height.
    view.setBounds({ x: 0, y: 55, width: winSize.width, height: winSize.height - 55 });
  }

  // 🔹 Function to check if we are online (Uses fetch which may need special handling in Electron main process, 
  // but we'll keep the Chat's implementation for now)
  async function isOnline() {
    try {
      const { net } = require('electron'); // Use Electron's net module for main process requests
      const request = net.request('https://www.google.com');
      return new Promise((resolve) => {
        request.on('response', (response) => {
          resolve(response.statusCode === 200);
        });
        request.on('error', () => {
          resolve(false);
        });
        request.end();
      });
    } catch {
      return false;
    }
  }

  // 🔹 Load URL or fallback to T-Rex
  async function loadURLWithFallback(url) {
    const online = await isOnline();
    if (online) {
      try {
        await view.webContents.loadURL(url);
      } catch (err) {
        console.error('Failed to load page:', err);
        view.webContents.loadFile(trexPath);
      }
    } else {
      console.log('Offline — loading T-Rex runner');
      view.webContents.loadFile(trexPath);
    }
  }

  // Developer tools for the MAIN WINDOW (Toolbar)
  win.webContents.openDevTools({ mode: 'detach' });

  // IPC listeners

  // NOTE: Switched from winContent to win.webContents in the toggle function
  ipcMain.on('toogle-dev-tool', () => {
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    } else {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Simplified navigation IPC handlers
  ipcMain.on('go-back', () => {
    if (view.webContents.canGoBack()) view.webContents.goBack();
  });

  ipcMain.handle('can-go-back', () => {
    return view.webContents.canGoBack();
  });

  ipcMain.on('go-forward', () => {
    if (view.webContents.canGoForward()) view.webContents.goForward();
  });

  ipcMain.handle('can-go-forward', () => {
    return view.webContents.canGoForward();
  });

  ipcMain.on('refresh', () => {
    view.webContents.reload();
  });

  ipcMain.handle('go-to-page', (event, url) => {
    return loadURLWithFallback(url);
  });

  ipcMain.handle('current-url', () => {
    return view.webContents.getURL();
  });

  // Navigation listener — sync address bar
  view.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
    if (isMainFrame) {
      // Send the new URL to the renderer process (Angular toolbar)
      win.webContents.send('navigation-started', url);
    }
  });

  // Window ready-to-show event
  win.once('ready-to-show', async () => {
    fitViewToWin();
    const defaultURL = 'https://amiens.unilasalle.fr';
    // Load the initial page using the fallback logic
    await loadURLWithFallback(defaultURL);
  });

  // Window resize event
  win.on('resized', () => {
    fitViewToWin();
  });

  // When user is offline and a load fails → show T-Rex
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.log('Load failed — showing offline T-Rex');
      // Load T-Rex only if the current content isn't already T-Rex or about:blank
      if (!view.webContents.getURL().includes('trex/index.html')) {
          view.webContents.loadFile(trexPath);
      }
    }
  });
});