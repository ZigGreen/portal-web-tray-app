const Vue = require('vue/dist/vue.min');
const { ipcRenderer, remote } = require('electron');
const mainProcess = remote.require('./main');
const assign = (...args) => Object.assign({}, ...args);
const JSONEditor = require('jsoneditor');


document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector(".editor");
    const options = {
        mode: 'code',
        onChangeText: (x) => {
            try {
                mainProcess.setProxyData(JSON.parse(x));
            } catch (e) {
                console.error(e);
            }
        }
    };
    const editor = new JSONEditor(container, options);
    editor.aceEditor.setTheme("ace/theme/twilight");

    // set json
    const json = mainProcess.getSettings().proxyData || {};
    editor.set(json);


/*    const vueApp = new Vue({
        el: '#app',
        methods: {
            changeDir() {
                this.dir = mainProcess.selectDirectory();
            },
            changeApp(e) {
                this.appId = mainProcess.selectAppId(e.target.value);
            },
            updateEnv(key, e) {
                this.env = mainProcess.serEnv(assign(this.env, { [key]: e.target.value }));
            }
        },
        data: Object.assign({}, mainProcess.getSettings())
    });*/
});