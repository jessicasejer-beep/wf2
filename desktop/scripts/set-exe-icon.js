// Pose l'icône et les informations de version sur l'exécutable Windows,
// sans Wine (édition des ressources en JavaScript pur).
const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');
const PE = require('pe-library');
const pkg = require('../package.json');

const exePath = path.join(__dirname, '..', 'dist', 'win-unpacked', 'Kanban Projets.exe');
const exe = PE.NtExecutable.from(fs.readFileSync(exePath));
const res = PE.NtExecutableResource.from(exe);

const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const groupId = groups.length ? groups[0].id : 1;
const lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, iconFile.icons.map(i => i.data));

const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
if (vi) {
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  vi.setFileVersion(major, minor, patch, 0, 1033);
  vi.setProductVersion(major, minor, patch, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: pkg.productName,
    ProductName: pkg.productName,
    CompanyName: pkg.author,
    OriginalFilename: 'Kanban Projets.exe',
    InternalName: 'Kanban Projets',
    LegalCopyright: '',
  });
  vi.outputToResourceEntries(res.entries);
}
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log('Icône et version appliquées à', exePath);
