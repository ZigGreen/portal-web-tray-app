const { app, BrowserWindow, ipcMain, Tray, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const fixPath = require('fix-path');

fixPath();

let dir = require('os').homedir();
try {
    dir = JSON.parse(fs.readFileSync(`${require('os').homedir()}/tinkoff.json`).toString()).dir;
} catch (e) {

}

const assetsDirectory = path.join(__dirname, 'assets');


let tray = undefined;
let window = undefined;

const appName = 'invest';
const staticInvest = `static:${appName}`;
const serverInvest = `server:${appName}`;

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
    tray = new Tray(path.join(assetsDirectory, 'sunTemplate.png'))
    tray.on('right-click', () => {
        if (!processes[staticInvest]) {
            start(staticInvest);
        }
        if (!processes[serverInvest]) {
            start(serverInvest);
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
    debugger

    if (window.isVisible()) {
        window.hide()
    } else {
        showWindow()
    }
};

const showWindow = () => {
    const position = getWindowPosition();
    window.setPosition(position.x, position.y, false);
    window.show();
    window.focus();
};

process.chdir(dir);


const processes = {};
const start = task => {
    if (processes[task]) {
        process.kill(-processes[task].pid);
    }
    const subproc = processes[task] = spawn('npm', ['run', task], { detached: true });

    const send = (...args) => {
        if (processes[task] === subproc || !processes[task]) {
            window.webContents.send(...args);
        }
    };

    send('started', task);

    subproc.stdout.on('data', data => {
        console.log(`stdout: ${data}`);
        if (data.toString().includes('Rebuild')) {
            tray.setImage(path.join(assetsDirectory, 'cloudTemplate.png'));
        }
        if (data.toString().includes('Server start on port 3000')) {
            tray.setImage(path.join(assetsDirectory, 'sunTemplate.png'));
        }
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


exports.selectDirectory = function selectDirectory() {
    [dir] = dialog.showOpenDialog(window, {
        properties: ['openDirectory']
    });
    fs.writeFileSync(
        `${require('os').homedir()}/tinkoff.json`
        , JSON.stringify({ dir }));
    return dir;
};

exports.getDirectory = function getDirectory() {
    return dir;
};
