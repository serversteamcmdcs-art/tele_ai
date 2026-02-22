const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('teleai', {
  platform: process.platform,
  isDesktop: true,
});
