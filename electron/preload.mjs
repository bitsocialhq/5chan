import { contextBridge, ipcRenderer, webUtils } from 'electron';

// dev uses http://localhost, prod uses file://...index.html
const isDev = window.location.protocol === 'http:';

const defaultPkcOptions = {
  pkcRpcClientsOptions: ['ws://localhost:9138'],
  httpRoutersOptions: ['https://peers.pleb.bot', 'https://routing.lol', 'https://peers.forumindex.com', 'https://peers.plebpubsub.xyz'],
};

contextBridge.exposeInMainWorld('isElectron', true);
contextBridge.exposeInMainWorld('defaultPkcOptions', defaultPkcOptions);
contextBridge.exposeInMainWorld('defaultMediaIpfsGatewayUrl', 'http://localhost:6473');

// receive PKC RPC auth key from main
ipcRenderer.on('pkc-rpc-auth-key', (event, pkcRpcAuthKey) => contextBridge.exposeInMainWorld('pkcRpcAuthKey', pkcRpcAuthKey));
ipcRenderer.send('get-pkc-rpc-auth-key');

contextBridge.exposeInMainWorld('electronApi', {
  isElectron: true,
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  automateUploadMedia: (options) => ipcRenderer.invoke('automate-upload-media', options),
  automateUploadGeneratedMedia: (options) => ipcRenderer.invoke('automate-upload-generated-media', options),
  downloadAndInstallUpdate: (options) => ipcRenderer.invoke('download-and-install-update', options),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return null;
    }
  },
});
