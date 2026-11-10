"""Tests du classeur Excel avec macros, exécutés dans LibreOffice (mode de compatibilité VBA).

Usage : python3 tests/test_xlsm.py
Construit la variante de test (module TestsAuto en plus), l'ouvre dans LibreOffice sans
interface, appelle les fonctions de test VBA et vérifie le contenu du classeur livré.
LibreOffice n'est pas Excel : les fonctions propres à Windows (sélecteur de dossier,
presse-papiers) ne sont pas testées ici ; voir excel/RECETTE.md pour l'essai dans Excel.
"""
import os
import subprocess
import sys
import tempfile
import time
import zipfile

import uno
from com.sun.star.beans import PropertyValue

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
work = tempfile.mkdtemp(prefix="wf-xlsm-")
test_file = os.path.join(work, "test.xlsm")
subprocess.run(["node", os.path.join(ROOT, "tools/build-xlsm.mjs"), "--tests", test_file], check=True)
subprocess.run(["node", os.path.join(ROOT, "tools/build-xlsm.mjs")], check=True)

ok_count = 0
fail = []


def check(cond, label, extra=""):
    global ok_count
    if cond:
        ok_count += 1
        print("  ✓ " + label)
    else:
        fail.append(label)
        print("  ✗ " + label + (" → " + str(extra)[:600] if extra != "" else ""))


# --- Contenu du classeur livré ---------------------------------------------------------
print("■ Classeur livré")
z = zipfile.ZipFile(os.path.join(ROOT, "Fichier-de-travail-import-WF.xlsm"))
names = z.namelist()
ct = z.read("[Content_Types].xml").decode()
check("xl/vbaProject.bin" in names, "projet VBA présent")
check("macroEnabled.main+xml" in ct and 'Extension="bin"' in ct, "type de classeur avec macros")
check("customUI/customUI.xml" in names and "ui/extensibility" in z.read("_rels/.rels").decode(), "onglet de ruban déclaré")
check('activeTab="0"' in z.read("xl/workbook.xml").decode(), "onglet de travail actif à l'ouverture")
check(sum(1 for n in names if n.startswith("xl/media/")) == 47, "images des pictos conservées")
s1 = z.read("xl/worksheets/sheet1.xml").decode()
check(s1.count("<dataValidation ") == 5 and s1.count("<conditionalFormatting") == 7, "listes déroulantes et couleurs du modèle conservées")
from oletools.olevba import VBA_Parser  # noqa: E402

vp = VBA_Parser(os.path.join(ROOT, "Fichier-de-travail-import-WF.xlsm"))
mods = sorted(name for (_, _, name, _) in vp.extract_macros())
check(mods == sorted(["Actions.bas", "ApiWindows.bas", "Feuil1.cls", "Feuil2.cls", "Feuil3.cls", "Outils.bas", "Regles.bas", "ThisWorkbook.cls"]),
      "8 modules VBA relus par olevba", mods)
check("TestsAuto" not in str(mods), "le module de test n'est pas livré")

# --- Exécution dans LibreOffice ---------------------------------------------------------
print("■ Exécution des macros dans LibreOffice")
profile = os.path.join(work, "profile")
port = 2083
proc = subprocess.Popen(["soffice", "--headless", "--norestore", "--nologo", f"-env:UserInstallation=file://{profile}",
                         f"--accept=socket,host=127.0.0.1,port={port};urp;"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ctx = None
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
for _ in range(60):
    try:
        ctx = resolver.resolve(f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
        break
    except Exception:
        time.sleep(1)
if ctx is None:
    print("LibreOffice n'a pas démarré")
    sys.exit(1)


def prop(n, v):
    p = PropertyValue()
    p.Name, p.Value = n, v
    return p


desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
# MacroExecutionMode 4 = toujours exécuter (document de test local)
doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(test_file), "_blank", 0,
                                   (prop("Hidden", False), prop("MacroExecutionMode", 4)))
libs = doc.BasicLibraries
check(libs.hasByName("VBAProject"), "bibliothèque VBAProject chargée")
lib = libs.getByName("VBAProject") if libs.hasByName("VBAProject") else None
if lib is not None:
    check(all(lib.hasByName(m) for m in ["Actions", "Outils", "Regles", "ApiWindows", "TestsAuto"]), "modules importés", lib.getElementNames())
sp = doc.getScriptProvider()


def call(module, fn, *args):
    script = sp.getScript(f"vnd.sun.star.script:VBAProject.{module}.{fn}?language=Basic&location=document")
    return script.invoke(args, (), ())[0]


def run_suite(title, module, fn, *args):
    print("■ " + title)
    try:
        out = call(module, fn, *args)
    except Exception as e:  # erreur d'exécution VBA
        check(False, title + " : exécution", e)
        return
    if not out or not out.split(" ")[0].isdigit():
        check(False, title + " : résultat illisible", repr(out)[:800])
        return
    head, _, rest = out.partition("\n")
    for line in rest.split("\nECHEC : ")[0:] if False else rest.split("ECHEC : ")[1:]:
        check(False, " ".join(line.split()))
    n_ok = int(head.split(" ")[0])
    n_ko = int(head.split(", ")[1].split(" ")[0])
    global ok_count
    ok_count += n_ok
    print(f"  ✓ {n_ok} vérifications réussies" + (f", {n_ko} échouées" if n_ko else ""))
    if "--- Rapport ---" in out:
        print("    " + out.split("--- Rapport ---")[1].strip().replace("\n", "\n    "))


run_suite("Texte, tri, CSV", "TestsAuto", "TestTexte")
run_suite("Règles de contrôle", "TestsAuto", "TestControle")
run_suite("Contrôle par rapport au dossier", "TestsAuto", "TestDossier")
run_suite("Aller-retour sur l'exemple import.csv", "TestsAuto", "TestCsv", os.path.join(ROOT, "ref/import.csv"))
run_suite("Vérifier : couleurs, notes, feuille Contrôle", "TestsAuto", "TestVerifier")
run_suite("Import d'un CSV et fichiers absents", "TestsAuto", "TestImport")

doc.close(True)
try:
    desktop.terminate()
except Exception:
    pass
try:
    proc.wait(timeout=30)
except subprocess.TimeoutExpired:
    proc.kill()

print(f"\n{ok_count} réussis, {len(fail)} échoués")
if fail:
    print("Échecs :\n - " + "\n - ".join(fail))
    sys.exit(1)
