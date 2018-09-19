const { ipcRenderer, remote } = require('electron');
const path = require('path');
const { Terminal } = require('xterm');
const mainProcess = remote.require('./main');
const terminalServer = new Terminal({ cols: 120 });
const terminalStatic = new Terminal();
const Vue = require('vue/dist/vue.min');


const staticTask = `static:`;
const serverTask = `server:`;


ipcRenderer.on(staticTask, (e, x) => {
    x.split('\n').forEach(x => {
        terminalStatic.writeln(x);
    });
});

ipcRenderer.on(serverTask, (e, x) => {
    x.split('\n').forEach(x => {
        terminalServer.writeln(x);
    });
});

document.addEventListener('DOMContentLoaded', () => {

    const vueApp = new Vue({
        el: '#app',
        methods: {
            startAll() {
                ipcRenderer.send('start', staticTask);
                ipcRenderer.send('start', serverTask);
            },

            stopAll() {
                ipcRenderer.send('stop', staticTask);
                ipcRenderer.send('stop', serverTask);
                terminalServer.clear();
                terminalStatic.clear();
            },

            openSettings() {
                const settingsWindow = new remote.BrowserWindow({
                    width: 500,
                    height: 380,
                    fullscreenable: false,
                    show: false,
                    resizable: false,
                    transparent: false,
                    webPreferences: {
                        // Prevents renderer process code from not running when window is
                        // hidden
                        backgroundThrottling: false
                    },
                    modal: true,
                });
                const settingsTemplate = path.join('file://', __dirname, 'settings.html');
                settingsWindow.loadURL(settingsTemplate);

                settingsWindow.show();
                settingsWindow.focus();
            },

            exitApp() {
                ipcRenderer.send('exit');
            },

            startTask(type) {
                ipcRenderer.send('start', `${type}:`);
            }
        },

        data: {
            dir: mainProcess.getSettings().dir,
            activeTab: null,
            serverActive: false,
            staticActive: false,
        }
    });

    terminalStatic.open(document.getElementById('terminalStatic'));
    terminalServer.open(document.getElementById('terminalServer'));

    vueApp.activeTab = 'static';

    ipcRenderer.on('started', (e, x) => {
        if (x === serverTask) {
            vueApp.serverActive = true;
        }
        if (x === staticTask) {
            vueApp.staticActive = true;
        }
    });

    ipcRenderer.on('exits', (e, x) => {
        if (x === serverTask) {
            vueApp.serverActive = false;
        }
        if (x === staticTask) {
            vueApp.staticActive = false;
        }
    });

});
