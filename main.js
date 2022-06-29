const { app, BrowserWindow, desktopCapturer, Menu, dialog, globalShortcut, ipcMain } = require('electron');

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  // new Window for DevTools
  // let  devtools = new BrowserWindow();
  // win.webContents.setDevToolsWebContents(devtools.webContents);
  // win.webContents.openDevTools({ mode: 'detach' });

  win.setMenu(null);
  win.setIcon('./src/icon.png');
  win.setTitle('Screen Recorder');
  win.loadFile('./src/index.html');
  
  win.on('closed', () => {
    win = null;
  });
  win.on('ready-to-show', () => {
    win.show();
  });
  
}

ipcMain.handle(
  'DESKTOP_CAPTURER_GET_SOURCES',
  (event, opts) => desktopCapturer.getSources(opts)
) 

ipcMain.handle(
  'SAVE_VIDEO', 
  (event, data) => dialog.showSaveDialog(data)
)

ipcMain.on('MENU_GET_SCREENS', (event, item) => {
  const screens = JSON.parse(item);
  const menu = Menu.buildFromTemplate(screens.map(source => {
    return {
      label: source.name,
      click: () => win.webContents.send('MENU_SELECT_SCREEN', source)
    }
  }
  ))
  menu.popup()
})

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register('Alt+S', () => {
    win.webContents.send('START', 'Alt+S')
    ipcMain.on('IS_SELECTED', (event, data) => {
      data && win.minimize();
    })
  });
  globalShortcut.register('Alt+P', () => {
    win.webContents.send('PAUSE', 'Alt+P')
  });
  globalShortcut.register('Alt+R', () => {
    win.webContents.send('RESUME', 'Alt+R')
  })
  globalShortcut.register('Alt+T', () => {
    win.webContents.send('STOP', 'Alt+T')
    win.show();
  })
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()

})
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
})