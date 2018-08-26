const { app, BrowserWindow, ipcMain, Tray, dialog, remote } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const fixPath = require('fix-path');

fixPath();

function getSettingsFromDisc() {
    const settings = {
        appId: 'invest',
        dir: undefined
    };

    try {
        return Object.assign({},
            settings,
            JSON.parse(fs.readFileSync(`${require('os').homedir()}/tinkoff.json`).toString())
        );
    } catch (e) {
        return settings;
    }
}

function saveSettings(settingsPart) {
    fs.writeFileSync(
        `${require('os').homedir()}/tinkoff.json`,
        JSON.stringify(Object.assign({}, getSettingsFromDisc(), settingsPart))
    );
}



const assetsDirectory = path.join(__dirname, 'assets');


let tray = undefined;
let window = undefined;

const staticTask = 'static:';
const serverTask = 'server:';

// Don't show the app in the doc
app.dock.hide();

app.on('ready', () => {
    createTray();
    createWindow();
});

// Quit the app when the window is closed
app.on('window-all-closed', () => {
    app.quit()
});

const createTray = () => {
    tray = new Tray(path.join(assetsDirectory, 'atom-shape.png'));
    tray.on('right-click', () => {
        if (!processes[staticTask]) {
            start(staticTask);
        }
        if (!processes[serverTask]) {
            start(serverTask);
        }
        toggleWindow();
    });
    tray.on('double-click', toggleWindow);
    tray.on('click', function (event) {
        toggleWindow();
        // Show devtools when command clicked
        if (window.isVisible() && process.defaultApp && event.shiftKey) {
            window.openDevTools({ mode: 'detach' })
        }
    })
};

const getWindowPosition = () => {
    const windowBounds = window.getBounds();
    const trayBounds = tray.getBounds();

    // Center window horizontally below the tray icon
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));

    // Position window 4 pixels vertically below the tray icon
    const y = Math.round(trayBounds.y + trayBounds.height + 4);

    return { x: x, y: y };
};

const createWindow = () => {
    window = new BrowserWindow({
        width: 900,
        height: 460,
        show: false,
        frame: false,
        fullscreenable: false,
        resizable: false,
        transparent: true,
        webPreferences: {
            // Prevents renderer process code from not running when window is
            // hidden
            backgroundThrottling: false
        }
    });
    window.loadURL(`file://${path.join(__dirname, 'index.html')}`);

    window.on('blur', () => {
        if (!window.webContents.isDevToolsOpened()) {
            window.hide()
        }
    })
};

const toggleWindow = () => {
    if (window.isVisible()) {
        window.hide()
    } else {
        showWindow()
    }
};
console.log(process.version);
const showWindow = () => {
    const position = getWindowPosition();
    window.setPosition(position.x, position.y, false);
    window.setVisibleOnAllWorkspaces(true);
    window.show();
    window.focus();
    window.setVisibleOnAllWorkspaces(true);
};


const processes = {};
const start = task => {
    if (processes[task]) {
        try {
            process.kill(-processes[task].pid)
        } catch (e) {
            console.error(e);
        }
    }
    const { dir, appId } = getSettingsFromDisc();

    if (!dir) {
        window.webContents.send(task, 'go to settings and select portal-web directory');
        return;
    }

    process.chdir(dir);
    const subproc = processes[task] = spawn('npm', ['run', task + appId], { detached: true });

    const send = (...args) => {
        if (processes[task] === subproc || !processes[task]) {
            window.webContents.send(...args);
        }
    };

    send('started', task);

    subproc.stdout.on('data', data => {
        console.log(`stdout: ${data}`);
        send(task, data.toString());
    });

    subproc.stderr.on('data', data => {
        console.log(`stderr: ${data}`);
        send(task, data.toString());
    });

    subproc.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        send('exits', task);
    });
};

ipcMain.on('start', (e, task) => {
    start(task);
});

ipcMain.on('stop', (e, task) => {
    if (processes[task]) {
        process.kill(-processes[task].pid);
    }
    processes[task] = undefined;
});


ipcMain.on('exit', () => {
    app.quit();
});


exports.getSettings = function getSettings() {
    return getSettingsFromDisc();
};

exports.selectDirectory = function selectDirectory() {
    [dir] = dialog.showOpenDialog(null, {
        properties: ['openDirectory']
    });

    saveSettings({ dir });
    return getSettingsFromDisc().dir;
};

exports.selectAppId = function selectAppId(appId) {
    saveSettings({ appId });
    return getSettingsFromDisc().appId;
};
