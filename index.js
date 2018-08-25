const { ipcRenderer, remote } = require('electron');
const { Terminal } = require('xterm');
const mainProcess = remote.require('./main');
const terminalServer = new Terminal({ cols: 120 });
const terminalStatic = new Terminal();
const Vue = require('vue/dist/vue.min');

const appName = 'invest';
const staticInvest = `static:${appName}`;
const serverInvest = `server:${appName}`;


ipcRenderer.on(staticInvest, (e, x) => {
    x.split('\n').forEach(x => {
        terminalStatic.writeln(x);
    });
});

ipcRenderer.on(serverInvest, (e, x) => {
    x.split('\n').forEach(x => {
        terminalServer.writeln(x);
    });
});

document.addEventListener('DOMContentLoaded', () => {

    const vueApp = new Vue({
        el: '#app',
        methods: {
            startAll() {
                ipcRenderer.send('start', staticInvest);
                ipcRenderer.send('start', serverInvest);
            },

            stopAll() {
                ipcRenderer.send('stop', staticInvest);
                ipcRenderer.send('stop', serverInvest);
                terminalServer.clear();
                terminalStatic.clear();
            },

            changeDir() {
                document.getElementById('dir').innerText = mainProcess.selectDirectory();
            },

            exitApp() {
                ipcRenderer.send('exit');
            },

            startTask(type) {
                ipcRenderer.send('start', `${type}:invest`);
            }
        },

        data: {
            dir: mainProcess.getDirectory(),
            activeTab: null,
            serverActive: false,
            staticActive: false,
        }
    });

    terminalStatic.open(document.getElementById('terminalStatic'));
    terminalServer.open(document.getElementById('terminalServer'));

    vueApp.activeTab = 'server';

    ipcRenderer.on('started', (e, x) => {
        if (x === serverInvest) {
            vueApp.serverActive = true;
        }
        if (x === staticInvest) {
            vueApp.staticActive = true;
        }
    });

    ipcRenderer.on('exits', (e, x) => {
        if (x === serverInvest) {
            vueApp.serverActive = false;
        }
        if (x === staticInvest) {
            vueApp.staticActive = false;
        }
    });
});
