import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import isDev from 'electron-is-dev';
import { LaTeXCompiler } from '../src/services/latexCompiler';

let mainWindow: BrowserWindow;
let latexCompiler: LaTeXCompiler;

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev // Disable web security in development for easier testing
    },
    titleBarStyle: 'default',
    show: false,
    icon: isDev ? undefined : path.join(__dirname, '../build/icon.png') // App icon for production
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
    
    // Enable hot reload for development (optional - requires electron-reload package)
    try {
      require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
      });
    } catch (error) {
      console.log('electron-reload not available - hot reload disabled');
    }
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize LaTeX compiler
  latexCompiler = new LaTeXCompiler();
  setupLatexCompilerEvents();

  createWindow();
  createMenu();
  setupIpcHandlers();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on app quit
app.on('before-quit', async () => {
  if (latexCompiler) {
    await latexCompiler.cleanup();
  }
});

function setupLatexCompilerEvents(): void {
  // Forward LaTeX compiler events to renderer process
  latexCompiler.on('progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('latex:progress', progress);
    }
  });

  latexCompiler.on('job-completed', (result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('latex:job-completed', result);
    }
  });

  latexCompiler.on('job-cancelled', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('latex:job-cancelled', data);
    }
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Presentation',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-presentation');
          }
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-action', 'open-presentation');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-action', 'save-presentation');
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-action', 'save-presentation-as');
          }
        },
        { type: 'separator' },
        {
          label: 'Export PDF',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-action', 'export-pdf');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom'
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          role: 'zoomIn'
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomOut'
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'Slide',
      submenu: [
        {
          label: 'New Slide',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-slide');
          }
        },
        {
          label: 'Duplicate Slide',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow.webContents.send('menu-action', 'duplicate-slide');
          }
        },
        {
          label: 'Delete Slide',
          accelerator: 'Delete',
          click: () => {
            mainWindow.webContents.send('menu-action', 'delete-slide');
          }
        },
        { type: 'separator' },
        {
          label: 'Previous Slide',
          accelerator: 'CmdOrCtrl+Left',
          click: () => {
            mainWindow.webContents.send('menu-action', 'previous-slide');
          }
        },
        {
          label: 'Next Slide',
          accelerator: 'CmdOrCtrl+Right',
          click: () => {
            mainWindow.webContents.send('menu-action', 'next-slide');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: 'Hide ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideOthers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupIpcHandlers(): void {
  // File dialog handlers
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Presentation Files', extensions: ['lpe', 'json'] },
        { name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const filePath = result.filePaths[0];
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return {
          success: true,
          filePath,
          content: fileContent
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to read file: ${error}`
        };
      }
    }

    return { success: false, canceled: true };
  });

  ipcMain.handle('dialog:saveFile', async (_event, data) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Presentation Files', extensions: ['lpe'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      defaultPath: 'presentation.lpe'
    });

    if (!result.canceled && result.filePath) {
      try {
        const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        fs.writeFileSync(result.filePath, content, 'utf-8');
        return {
          success: true,
          filePath: result.filePath
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to save file: ${error}`
        };
      }
    }

    return { success: false, canceled: true };
  });

  // LaTeX compilation handlers
  ipcMain.handle('latex:compile', async (_event, source: string, options: any = {}) => {
    try {
      const jobId = await latexCompiler.compile(source, options);
      return { success: true, jobId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('latex:cancel', async (_event, jobId: string) => {
    try {
      const cancelled = latexCompiler.cancelJob(jobId);
      return { success: true, cancelled };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('latex:getQueueStatus', async () => {
    try {
      const status = latexCompiler.getQueueStatus();
      return { success: true, status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('latex:clearQueue', async () => {
    try {
      latexCompiler.clearQueue();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('latex:checkAvailability', async () => {
    try {
      const availability = await latexCompiler.checkLatexAvailability();
      return { success: true, ...availability };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Window management handlers
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Application info handlers
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getName', () => {
    return app.getName();
  });

  ipcMain.handle('app:getPlatform', () => {
    return process.platform;
  });

  // Error reporting handler
  ipcMain.handle('app:reportError', async (_event, error: any) => {
    console.error('Renderer process error:', error);
    // TODO: Implement error reporting/logging
    return { success: true };
  });
}