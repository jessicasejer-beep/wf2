// Pont minimal entre la page et le fichier de données sur le disque.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopStore', {
  load: () => ipcRenderer.sendSync('store:load'),
  save: (json) => ipcRenderer.send('store:save', json),
  dataFolder: () => ipcRenderer.sendSync('store:folder'),
});
