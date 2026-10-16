"""Génère les jeux de test dans le dossier passé en argument.

Usage : python3 -I tests/make_fixtures.py <dossier_sortie>
"""
import os
import struct
import sys
import zipfile

import openpyxl

out = sys.argv[1]
os.makedirs(out, exist_ok=True)

# 1. Dossier de 30 fichiers (+ fichiers parasites et un sous-dossier)
root = os.path.join(out, "folder30", "Ressources_Chap1")
os.makedirs(os.path.join(root, "sous-dossier"), exist_ok=True)
os.makedirs(os.path.join(root, "__MACOSX"), exist_ok=True)
names = [f"doc{i}.pdf" for i in range(1, 25)]  # ordre naturel attendu : doc1, doc2 … doc10
names += ["Video_intro.mp4", "carte-europe.jpg", "audio_ch1.mp3", "sous_titres.vtt", "Eleve_fiche.docx"]
for n in names:
    with open(os.path.join(root, n), "wb") as f:
        f.write(b"x")
with open(os.path.join(root, "sous-dossier", "annexe.pdf"), "wb") as f:
    f.write(b"x")
for junk in [".DS_Store", "Thumbs.db", "desktop.ini", "~$brouillon.docx", ".cache", "import.csv"]:
    with open(os.path.join(root, junk), "wb") as f:
        f.write(b"x")
with open(os.path.join(root, "__MACOSX", "._doc1.pdf"), "wb") as f:
    f.write(b"x")

# 1 bis. Dossier contenant des noms avec espaces (interdits)
sp = os.path.join(out, "folder_espaces", "Lot")
os.makedirs(sp, exist_ok=True)
for n in ["mon fichier.pdf", "ok.pdf", "tête.mp4"]:
    with open(os.path.join(sp, n), "wb") as f:
        f.write(b"x")

# 2. Archive zip classique (noms UTF-8)
zp = os.path.join(out, "archive.zip")
with zipfile.ZipFile(zp, "w") as z:
    for n in ["Lot/a10.pdf", "Lot/a2.pdf", "Lot/été.mp4", "Lot/.DS_Store", "__MACOSX/Lot/._a2.pdf", "Lot/"]:
        if n.endswith("/"):
            z.writestr(zipfile.ZipInfo(n), b"")
        else:
            z.writestr(n, b"x")


def make_zip64(path, files):
    """Archive avec enregistrement de fin zip64 (EOCD64 + locator), champs EOCD à 0xFFFF…"""
    local = b""
    cd = b""
    for n in files:
        nb = n.encode("utf-8")
        off = len(local)
        local += struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, 0x800, 0, 0, 0, 0, 0, 0, len(nb), 0) + nb
        cd += struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 45, 20, 0x800, 0, 0, 0, 0, 0, 0,
                          len(nb), 0, 0, 0, 0, 0, off) + nb
    cd_off = len(local)
    z64_off = cd_off + len(cd)
    eocd64 = struct.pack("<IQHHIIQQQQ", 0x06064B50, 44, 45, 45, 0, 0, len(files), len(files), len(cd), cd_off)
    loc = struct.pack("<IIQI", 0x07064B50, 0, z64_off, 1)
    eocd = struct.pack("<IHHHHIIH", 0x06054B50, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0)
    with open(path, "wb") as f:
        f.write(local + cd + eocd64 + loc + eocd)


make_zip64(os.path.join(out, "archive64.zip"), ["z1.pdf", "z2.pdf", "z10.pdf"])

# 3. Archive avec noms CP437 (sans drapeau UTF-8), comme l'explorateur Windows
cp = os.path.join(out, "cp437.zip")
c437 = "fiche_\u00e9l\u00e8ve.pdf".encode("cp437")
local = struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, 0, 0, 0, 0, 0, 0, 0, len(c437), 0) + c437
cdr = struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 20, 20, 0, 0, 0, 0, 0, 0, 0, len(c437), 0, 0, 0, 0, 0, 0) + c437
eocd = struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, 1, 1, len(cdr), len(local), 0)
open(cp, "wb").write(local + cdr + eocd)

# 4. CSV point-virgule, UTF-8 avec BOM, guillemets, ligne vide, uuid rempli
hdr = ["Nom du fichier (extension comprise)", "Titre de la ressource"] + [f"c{i}" for i in range(3, 23)] + ["uuid"]
rows = [
    ["fiche1.pdf", "Fiche « un » ; avec point-virgule", "", "", "Chapitre 1", "", "", "Exercices", "", "texte", "ELE", "1", "", "", "", "FR", "0", "0", "", "", "", "", "1234-uuid"],
    [],
    ["fiche2.pdf", "Titre \"cité\"", "", "", "Chapitre 1", "", "", "Exercices", "", "texte", "ELE", "1", "", "", "", "FR", "0", "0", "", "", "", "", ""],
]


def q(v):
    return '"' + v.replace('"', '""') + '"' if any(ch in v for ch in ';"\n') else v


with open(os.path.join(out, "semicolon.csv"), "w", encoding="utf-8-sig", newline="") as f:
    f.write(";".join(hdr) + "\r\n")
    for r in rows:
        f.write(";".join(q(v) for v in r) + "\r\n")

# 5. Classeur Excel « fait main » : onglet parasite en premier, onglet de travail en second
wb = openpyxl.Workbook()
ws0 = wb.active
ws0.title = "Notes"
ws0["A1"] = "Ceci n'est pas le tableau"
ws = wb.create_sheet("Travail")
ws.append(hdr)
ws.append(["img1.jpg", "Image 1", None, None, "Niveau 1", None, None, "images", None, "image", "ENS", 1, None, None, None, "FR", 0, 0, 12, None, None, "800/600", "uuid-a-ignorer"])
ws.append([None] * 23)
ws.append(["img2.jpg", "Image 2", None, None, "Niveau 1", None, None, "images", None, "image", "ENS", 1, None, None, None, "FR", 0, "O", None, None, None, None, None])
wb.save(os.path.join(out, "travail.xlsx"))
print("ok")
