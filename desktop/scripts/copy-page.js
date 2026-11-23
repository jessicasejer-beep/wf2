// Copie la page du projet (../index.html) dans l'application de bureau.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'index.html');
const destDir = path.join(__dirname, '..', 'app');
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, 'index.html'));
console.log('Page copiée dans desktop/app/index.html');
