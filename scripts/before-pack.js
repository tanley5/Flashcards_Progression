const { spawnSync } = require('child_process');
const path = require('path');

exports.default = async function beforePack() {
  const script = path.join(__dirname, 'rebuild-native.js');
  const result = spawnSync(process.execPath, [script, 'electron'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  if (result.status !== 0) {
    throw new Error('Failed to rebuild native modules for Electron');
  }
};
