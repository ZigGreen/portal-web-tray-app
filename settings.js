const Vue = require('vue/dist/vue.min');
const { ipcRenderer, remote } = require('electron');
const mainProcess = remote.require('./main');
const assign = (...args) => Object.assign({}, ...args);

document.addEventListener('DOMContentLoaded', () => {
    const vueApp = new Vue({
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
    });
});