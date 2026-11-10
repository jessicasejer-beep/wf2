Attribute VB_Name = "Actions"
' Boutons du classeur (onglet « Import WebFactory » du ruban et feuille « Contrôle ») :
' lire le dossier, importer un fichier, vérifier, copier le rapport, exporter import.csv,
' supprimer les données.
Option Explicit

Private Const NOM_CONTROLE As String = "Contrôle"
Private Const MAX_LIGNES_AFFICHEES As Long = 60
Private Const MAX_NOTES As Long = 2000

Private ruban As Object

' ---------------------------------------------------------------------------------------------
' Ruban
' ---------------------------------------------------------------------------------------------
Public Sub Ruban_Charge(r As Object)
    Set ruban = r
    On Error Resume Next
    ruban.ActivateTab "tabImportWF"
End Sub

Public Sub Ruban_Clic(control As Object)
    Select Case control.ID
        Case "btnDossier": LireDossier
        Case "btnImporter": ImporterFichier
        Case "btnVerifier": Verifier
        Case "btnRapport": AfficherRapport
        Case "btnCopier": CopierRapport
        Case "btnExporter": ExporterCsv
        Case "btnSupprimer": SupprimerDonnees
    End Select
End Sub

' ---------------------------------------------------------------------------------------------
' 1. Lire le dossier des fichiers
' ---------------------------------------------------------------------------------------------
Public Sub LireDossier()
    Dim fd As Object, chemin As String, fso As Object
    Set fd = Application.FileDialog(4)   ' sélecteur de dossier
    fd.Title = "Choisir le dossier qui contient les fichiers à importer"
    fd.AllowMultiSelect = False
    If fd.Show <> -1 Then Exit Sub
    chemin = fd.SelectedItems(1)

    Application.StatusBar = "Lecture du dossier…"
    Set fso = CreateObject("Scripting.FileSystemObject")
    Dim noms As New Collection, nbSous As Long, nbIgnores As Long, nbDoublons As Long, exemple As String
    Parcourir fso.GetFolder(chemin), "", noms, nbSous, nbIgnores, nbDoublons, exemple
    Application.StatusBar = False

    Dim n As Long, t() As String, item As Variant
    n = noms.Count
    If n = 0 Then
        MsgBox "Le dossier « " & chemin & " » ne contient aucun fichier utilisable" & _
            IIf(nbIgnores > 0, " (" & Pluriel(nbIgnores, "fichier système ignoré", "fichiers système ignorés") & ")", "") & ".", vbExclamation, "Lire le dossier"
        Exit Sub
    End If
    If n > DERNIERE_LIGNE_MAX - 1 Then
        MsgBox "Le dossier contient " & n & " fichiers : le modèle accepte au maximum " & (DERNIERE_LIGNE_MAX - 1) & " ressources.", vbExclamation, "Lire le dossier"
        Exit Sub
    End If
    ReDim t(1 To n)
    n = 0
    For Each item In noms
        n = n + 1: t(n) = item
    Next item
    TrierNaturel t, n

    ' Mémorise le dossier pour les contrôles
    Dim wd As Worksheet, arr() As Variant, i As Long
    Set wd = FeuilleDossier(True)
    wd.Cells.Clear
    wd.Range("A:A").NumberFormat = "@"
    wd.Range("A1").Value = chemin
    wd.Range("B1").Value = Now
    ReDim arr(1 To n, 1 To 1)
    For i = 1 To n: arr(i, 1) = t(i): Next i
    wd.Range("A2").Resize(n, 1).Value = arr

    ' Remplit le tableau
    Dim ws As Worksheet, derniere As Long, donnees As Variant, r As Long, nbExistants As Long
    Set ws = FeuilleTravail()
    derniere = DerniereLigne(ws)
    If derniere >= PREMIERE_LIGNE Then
        donnees = ws.Range(ws.Cells(1, 1), ws.Cells(derniere, NB_COL)).Value2
        For r = PREMIERE_LIGNE To derniere
            If Not LigneVide(donnees, r) Then nbExistants = nbExistants + 1
        Next r
    End If

    Dim infos As String
    If nbSous > 0 Then infos = infos & vbLf & "• " & Pluriel(nbSous, "fichier était dans un sous-dossier", "fichiers étaient dans des sous-dossiers") & " : ils doivent être à la racine de l'archive (seul leur nom a été gardé, ex. " & exemple & ")."
    If nbDoublons > 0 Then infos = infos & vbLf & "• " & Pluriel(nbDoublons, "doublon de nom ignoré", "doublons de nom ignorés") & " (même nom dans plusieurs sous-dossiers)."
    If nbIgnores > 0 Then infos = infos & vbLf & "• " & Pluriel(nbIgnores, "fichier système ou caché ignoré", "fichiers système ou cachés ignorés") & " (.DS_Store, Thumbs.db, import.csv…)."

    If nbExistants = 0 Then
        EcrireNoms ws, PREMIERE_LIGNE, t, n
        Verifier False
        MsgBox "Dossier « " & chemin & " » : " & Pluriel(n, "fichier lu", "fichiers lus") & ", " & Pluriel(n, "ligne créée", "lignes créées") & " (une par fichier)." & infos & vbLf & vbLf & _
            "Complétez maintenant le tableau, puis cliquez sur « Vérifier ».", vbInformation, "Lire le dossier"
    Else
        Dim absents As Variant, nAbs As Long, rep As VbMsgBoxResult
        absents = FichiersAbsents(ws, t, n, nAbs)
        If nAbs = 0 Then
            Verifier False
            MsgBox "Dossier « " & chemin & " » : " & Pluriel(n, "fichier lu", "fichiers lus") & "." & infos & vbLf & vbLf & _
                "Tous les fichiers du dossier sont déjà dans le tableau. Le contrôle des noms a été fait : voir l'onglet « Contrôle ».", vbInformation, "Lire le dossier"
        Else
            rep = MsgBox("Dossier « " & chemin & " » : " & Pluriel(n, "fichier lu", "fichiers lus") & "." & infos & vbLf & vbLf & _
                "Le tableau contient déjà " & Pluriel(nbExistants, "ressource", "ressources") & " et " & Pluriel(nAbs, "fichier du dossier n'y est pas", "fichiers du dossier n'y sont pas") & "." & vbLf & vbLf & _
                "Oui : ajouter ces " & nAbs & " fichiers à la fin du tableau." & vbLf & _
                "Non : ne rien ajouter, utiliser le dossier seulement pour contrôler les noms.", vbYesNoCancel + vbQuestion, "Lire le dossier")
            If rep = vbCancel Then Exit Sub
            If rep = vbYes Then EcrireNoms ws, derniere + 1, absents, nAbs
            Verifier
        End If
    End If
End Sub

Private Function Ignorer(ByVal nom As String) As Boolean
    Dim b As String
    b = LCase$(nom)
    If b = ".ds_store" Or b = "thumbs.db" Or b = "desktop.ini" Or b = "import.csv" Then Ignorer = True
    If Left$(nom, 1) = "." Or Left$(nom, 2) = "~$" Then Ignorer = True
End Function

Private Sub Parcourir(dossier As Object, ByVal prefixe As String, noms As Collection, ByRef nbSous As Long, ByRef nbIgnores As Long, ByRef nbDoublons As Long, ByRef exemple As String)
    Dim f As Object, sd As Object, nom As String
    For Each f In dossier.Files
        nom = NFC(f.Name)
        If Ignorer(nom) Or (f.Attributes And 6) <> 0 Then   ' 2 = caché, 4 = système
            nbIgnores = nbIgnores + 1
        Else
            If prefixe <> "" Then
                nbSous = nbSous + 1
                If exemple = "" Then exemple = prefixe & nom
            End If
            On Error Resume Next
            noms.Add nom, nom
            If Err.Number <> 0 Then nbDoublons = nbDoublons + 1
            Err.Clear
            On Error GoTo 0
        End If
    Next f
    For Each sd In dossier.SubFolders
        If sd.Name = "__MACOSX" Or Left$(sd.Name, 1) = "." Then
            nbIgnores = nbIgnores + sd.Files.Count
        Else
            Parcourir sd, prefixe & sd.Name & "/", noms, nbSous, nbIgnores, nbDoublons, exemple
        End If
    Next sd
End Sub

Private Sub EcrireNoms(ws As Worksheet, ByVal premiere As Long, t As Variant, ByVal n As Long)
    Dim arr() As Variant, i As Long
    If n = 0 Then Exit Sub
    If premiere + n - 1 > DERNIERE_LIGNE_MAX Then
        MsgBox "Le modèle accepte au maximum " & (DERNIERE_LIGNE_MAX - 1) & " ressources.", vbExclamation
        Exit Sub
    End If
    ReDim arr(1 To n, 1 To 1)
    For i = 1 To n: arr(i, 1) = t(i): Next i
    Application.EnableEvents = False
    ws.Range(ws.Cells(premiere, 1), ws.Cells(premiere + n - 1, 1)).Value = arr
    Application.EnableEvents = True
End Sub

' Fichiers du dossier qui ne figurent dans aucune colonne de nom de fichier du tableau
Private Function FichiersAbsents(ws As Worksheet, t As Variant, ByVal n As Long, ByRef nAbs As Long) As Variant
    Dim presents As New Collection, derniere As Long, donnees As Variant, r As Long, c As Variant, nom As String
    Dim res() As String, i As Long, ok As Boolean, v As String
    derniere = DerniereLigne(ws)
    If derniere >= PREMIERE_LIGNE Then
        donnees = ws.Range(ws.Cells(1, 1), ws.Cells(derniere, NB_COL)).Value2
        For r = PREMIERE_LIGNE To derniere
            For Each c In Array(1, 13, 14, 15, 20)
                nom = NormFichier(TexteCellule(donnees(r, c)))
                If nom <> "" Then
                    On Error Resume Next
                    presents.Add nom, nom
                    On Error GoTo 0
                End If
            Next c
        Next r
    End If
    nAbs = 0
    ReDim res(1 To n)
    For i = 1 To n
        ok = False
        On Error Resume Next
        v = "": v = presents(t(i))
        On Error GoTo 0
        If v <> t(i) Then nAbs = nAbs + 1: res(nAbs) = t(i)
    Next i
    FichiersAbsents = res
End Function

' Bouton de la feuille « Contrôle » : ajoute au tableau les fichiers du dossier absents du tableau
Public Sub AjouterFichiersAbsents()
    Dim noms As Collection, liste() As String, n As Long, absents As Variant, nAbs As Long, ws As Worksheet
    Set ws = FeuilleTravail()
    Set noms = NomsDuDossier(liste, n)
    If n = 0 Then MsgBox "Aucun dossier n'a encore été lu.", vbInformation: Exit Sub
    absents = FichiersAbsents(ws, liste, n, nAbs)
    If nAbs = 0 Then MsgBox "Tous les fichiers du dossier sont déjà dans le tableau.", vbInformation: Exit Sub
    EcrireNoms ws, DerniereLigne(ws) + 1, absents, nAbs
    Verifier False
    ws.Activate
    MsgBox Pluriel(nAbs, "fichier ajouté", "fichiers ajoutés") & " à la fin du tableau.", vbInformation
End Sub

' ---------------------------------------------------------------------------------------------
' Importer un fichier Excel ou CSV existant
' ---------------------------------------------------------------------------------------------
Public Sub ImporterFichier()
    Dim f As Variant, ws As Worksheet, matrice As Collection, sepNom As String, ou As String
    f = Application.GetOpenFilename("Fichier d'import (*.csv;*.txt;*.xlsx;*.xlsm;*.xls),*.csv;*.txt;*.xlsx;*.xlsm;*.xls", , "Importer un fichier Excel ou CSV")
    If VarType(f) = vbBoolean Then Exit Sub
    If LCase$(CStr(f)) = LCase$(ThisWorkbook.FullName) Then
        MsgBox "Ce fichier est le classeur ouvert : choisissez un autre fichier.", vbExclamation: Exit Sub
    End If
    Set ws = FeuilleTravail()

    Dim ext As String
    ext = Extension(CStr(f))
    On Error GoTo Illisible
    If ext = "xlsx" Or ext = "xlsm" Or ext = "xls" Then
        Set matrice = LireClasseur(CStr(f), ou)
    Else
        Set matrice = LireCsv(LireTexte(CStr(f)), sepNom)
        ou = "séparateur " & sepNom
    End If
    On Error GoTo 0

    Dim lignes As Collection, notes As String
    Set lignes = PreparerLignes(matrice, notes)
    If lignes.Count = 0 Then MsgBox "« " & f & " » ne contient aucune ressource.", vbExclamation: Exit Sub
    If lignes.Count > DERNIERE_LIGNE_MAX - 1 Then MsgBox "Le fichier contient " & lignes.Count & " ressources : le modèle en accepte au maximum " & (DERNIERE_LIGNE_MAX - 1) & ".", vbExclamation: Exit Sub
    If DerniereLigne(ws) >= PREMIERE_LIGNE Then
        If MsgBox("Remplacer le contenu actuel du tableau par les " & lignes.Count & " ressources de « " & NomSeul(CStr(f)) & " » ?", vbYesNo + vbQuestion, "Importer") <> vbYes Then Exit Sub
    End If

    EcrireLignes ws, lignes
    ThisWorkbook.Names.Add Name:="_dernier_import", RefersTo:="=""" & Replace(NomSeul(CStr(f)), """", "") & " (" & ou & "), " & MaintenantTexte() & """", Visible:=False
    Verifier False
    MsgBox Pluriel(lignes.Count, "ressource importée", "ressources importées") & " depuis « " & NomSeul(CStr(f)) & " » (" & ou & ")." & notes & vbLf & vbLf & _
        "Le résultat du contrôle est dans l'onglet « Contrôle ».", vbInformation, "Importer"
    Exit Sub
Illisible:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    MsgBox "« " & f & " » n'a pas pu être lu (" & Err.Description & ").", vbExclamation, "Importer"
End Sub

' Lignes à importer : en-tête reconnu, lignes vides et valeurs uuid ignorées (notes = explications)
Public Function PreparerLignes(matrice As Collection, ByRef notes As String) As Collection
    Dim debut As Long, ligne As Collection, nbUuid As Long, nbVides As Long, nbTrop As Long
    Dim lignes As New Collection, c As Long, vide As Boolean, i As Long
    debut = 1
    If matrice.Count > 0 Then
        If matrice(1).Count > 0 Then
            If LCase$(Left$(TrimTout(matrice(1)(1)), 14)) = "nom du fichier" Then debut = 2
        End If
    End If
    For i = debut To matrice.Count
        Set ligne = matrice(i)
        vide = True
        For c = 1 To ligne.Count
            If c <= NB_COL - 1 Then
                If TrimTout(ligne(c)) <> "" Then vide = False
            ElseIf c = NB_COL Then
                If TrimTout(ligne(c)) <> "" Then nbUuid = nbUuid + 1
            ElseIf TrimTout(ligne(c)) <> "" Then
                nbTrop = nbTrop + 1
            End If
        Next c
        If vide Then
            If i < matrice.Count Then nbVides = nbVides + 1
        Else
            lignes.Add ValeursLigne(ligne)
        End If
    Next i
    notes = ""
    If nbUuid > 0 Then notes = notes & vbLf & "• " & Pluriel(nbUuid, "valeur uuid ignorée", "valeurs uuid ignorées") & " (la colonne uuid est toujours vide)."
    If nbVides > 0 Then notes = notes & vbLf & "• " & Pluriel(nbVides, "ligne vide ignorée", "lignes vides ignorées") & "."
    If nbTrop > 0 Then notes = notes & vbLf & "• " & Pluriel(nbTrop, "valeur au-delà de la 23e colonne ignorée", "valeurs au-delà de la 23e colonne ignorées") & "."
    If debut = 1 Then notes = notes & vbLf & "• Pas de ligne d'en-tête reconnue : la première ligne a été considérée comme une ressource."
    Set PreparerLignes = lignes
End Function

' Les 22 premières cellules d'une ligne lue (tableau neuf à chaque appel)
Private Function ValeursLigne(ligne As Collection) As Variant
    Dim valeurs() As String, c As Long
    ReDim valeurs(1 To NB_COL - 1)
    For c = 1 To ligne.Count
        If c > NB_COL - 1 Then Exit For
        valeurs(c) = ligne(c)
    Next c
    ValeursLigne = valeurs
End Function

' Remplace le contenu du tableau par ces lignes
Public Sub EcrireLignes(ws As Worksheet, lignes As Collection)
    Dim arr() As Variant, r As Long, c As Long, valeurs As Variant
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    ws.Range(ws.Cells(PREMIERE_LIGNE, 1), ws.Cells(DERNIERE_LIGNE_MAX, NB_COL)).ClearContents
    If lignes.Count > 0 Then
        ReDim arr(1 To lignes.Count, 1 To NB_COL - 1)
        For r = 1 To lignes.Count
            valeurs = lignes(r)
            For c = 1 To NB_COL - 1
                arr(r, c) = ValeurPourCellule(valeurs(c), c)
            Next c
        Next r
        ws.Range(ws.Cells(PREMIERE_LIGNE, 1), ws.Cells(PREMIERE_LIGNE + lignes.Count - 1, NB_COL - 1)).Value = arr
    End If
    Application.EnableEvents = True
    Application.ScreenUpdating = True
End Sub

' Valeur à écrire dans une cellule du modèle (texte, ou nombre pour les colonnes 0/1)
Private Function ValeurPourCellule(ByVal v As String, ByVal c As Long) As Variant
    If c = 4 Or c = 12 Or c = 17 Or c = 18 Then
        If TrimTout(v) = "0" Or TrimTout(v) = "1" Then ValeurPourCellule = CLng(TrimTout(v)): Exit Function
    End If
    If v = "" Then ValeurPourCellule = Empty: Exit Function
    Select Case Left$(v, 1)
        Case "=", "+", "-", "@": v = "'" & v       ' ne pas transformer en formule
        Case "0": If c = 19 And Len(v) > 1 Then v = "'" & v   ' n° de page « 01 »
    End Select
    ValeurPourCellule = v
End Function

Private Function NomSeul(ByVal chemin As String) As String
    NomSeul = Mid$(chemin, InStrRev(Replace(chemin, "/", "\"), "\") + 1)
End Function

' Texte d'un fichier : UTF-8 (avec ou sans BOM) sinon Windows-1252
Private Function LireTexte(ByVal chemin As String) As String
    Dim n As Integer, octets() As Byte, taille As Long, s As String
    n = FreeFile
    Open chemin For Binary Access Read As #n
    taille = LOF(n)
    If taille = 0 Then Close #n: Exit Function
    ReDim octets(0 To taille - 1)
    Get #n, , octets
    Close #n
    If taille >= 3 Then
        If octets(0) = &HEF And octets(1) = &HBB And octets(2) = &HBF Then
            Dim reste() As Byte, i As Long
            If taille = 3 Then Exit Function
            ReDim reste(0 To taille - 4)
            For i = 3 To taille - 1: reste(i - 3) = octets(i): Next i
            If DecoderUtf8(reste, s) Then LireTexte = s: Exit Function
        End If
    End If
    If DecoderUtf8(octets, s) Then LireTexte = s Else LireTexte = DecoderWindows1252(octets)
End Function

' Lignes d'un classeur : onglet dont la cellule A1 commence par « Nom du fichier »
Private Function LireClasseur(ByVal chemin As String, ByRef ou As String) As Collection
    Dim wb As Workbook, sh As Worksheet, trouve As Worksheet, donnees As Variant, res As New Collection
    Dim r As Long, c As Long, ligne As Collection, derniere As Range
    Dim securite As Long
    Application.ScreenUpdating = False
    securite = Application.AutomationSecurity
    Application.AutomationSecurity = 3          ' ne pas exécuter les macros du fichier lu
    Set wb = Workbooks.Open(chemin, UpdateLinks:=0, ReadOnly:=True)
    Application.AutomationSecurity = securite
    For Each sh In wb.Worksheets
        If LCase$(Left$(CStr(sh.Range("A1").Value), 14)) = "nom du fichier" Then Set trouve = sh: Exit For
    Next sh
    If trouve Is Nothing Then
        Set trouve = wb.Worksheets(1)
        ou = "premier onglet « " & trouve.Name & " »"
    Else
        ou = "onglet « " & trouve.Name & " »"
    End If
    Set derniere = trouve.Cells.Find("*", , xlValues, , xlByRows, xlPrevious)
    If Not derniere Is Nothing Then
        donnees = trouve.Range(trouve.Cells(1, 1), trouve.Cells(derniere.Row, NB_COL)).Value
        For r = 1 To UBound(donnees, 1)
            Set ligne = New Collection
            For c = 1 To NB_COL
                ligne.Add TexteCellule(donnees(r, c))
            Next c
            res.Add ligne
        Next r
    End If
    wb.Close SaveChanges:=False
    Application.ScreenUpdating = True
    Set LireClasseur = res
End Function

' ---------------------------------------------------------------------------------------------
' 2. Vérifier
' ---------------------------------------------------------------------------------------------
Public Sub Verifier(Optional ByVal afficher As Boolean = True)
    Dim ws As Worksheet
    Set ws = FeuilleTravail()
    Application.ScreenUpdating = False
    Application.StatusBar = "Contrôle en cours…"
    Controler ws
    Marquer ws
    EcrireRapport
    Application.StatusBar = False
    Application.ScreenUpdating = True
    If afficher Then FeuilleControle().Activate
End Sub

Public Sub AfficherRapport()
    Verifier True
End Sub

' Couleurs et notes sur les cellules en erreur (les marques précédentes sont effacées)
Private Sub Marquer(ws As Worksheet)
    EffacerMarques ws
    Dim i As Long, cle As String, niveaux As New Collection, textes As New Collection, rang As Long, ancien As Long
    Dim cellule As Range, cles As New Collection
    For i = 1 To nbIss
        cle = issLigne(i) & "_" & issCol(i)
        rang = IIf(issNiveau(i) = "err", 3, IIf(issNiveau(i) = "dup", 2, 1))
        On Error Resume Next
        ancien = 0: ancien = niveaux(cle)
        On Error GoTo 0
        If ancien = 0 Then
            niveaux.Add rang, cle: cles.Add cle
            If issType(i) <> "req" Then
                textes.Add issMsg(i), cle
            Else
                textes.Add "", cle
            End If
        Else
            If rang > ancien Then niveaux.Remove cle: niveaux.Add rang, cle
            If issType(i) <> "req" Then
                Dim t As String
                t = textes(cle): textes.Remove cle
                If t <> "" Then t = t & vbLf & vbLf
                textes.Add t & issMsg(i), cle
            End If
        End If
    Next i
    Dim k As Variant, p As Long, nbNotes As Long, msg As String
    For Each k In cles
        p = InStr(k, "_")
        Set cellule = ws.Cells(CLng(Left$(k, p - 1)), CLng(Mid$(k, p + 1)))
        Select Case niveaux(k)
            Case 3: cellule.Interior.Color = COULEUR_ERREUR
            Case 2: cellule.Interior.Color = COULEUR_DOUBLON
            Case 1: cellule.Interior.Color = COULEUR_AVERT
        End Select
        msg = textes(k)
        If msg <> "" And nbNotes < MAX_NOTES Then
            nbNotes = nbNotes + 1
            Dim note As Object
            Set note = cellule.AddComment(msg)
            On Error Resume Next          ' taille de la note : simple confort d'affichage
            note.Shape.Width = 330
            note.Shape.Height = 24 + 15 * (Len(msg) \ 55 + 1)
            On Error GoTo 0
        End If
    Next k
End Sub

Public Sub EffacerMarques(ws As Worksheet)
    With ws.Range(ws.Cells(PREMIERE_LIGNE, 1), ws.Cells(DERNIERE_LIGNE_MAX, NB_COL))
        .Interior.Pattern = xlNone
        .ClearComments          ' les notes du modèle (ligne d'en-tête) sont conservées
    End With
End Sub

' Appelé quand une cellule du tableau est modifiée : retire sa couleur et sa note de contrôle,
' devenues obsolètes. (Seulement si la cellule était marquée, pour garder Ctrl+Z ailleurs.)
Public Sub RetirerMarquesModifiees(ByVal cible As Range)
    Dim zone As Range, cellule As Range, n As Long
    Set zone = Application.Intersect(cible, cible.Worksheet.Range(cible.Worksheet.Cells(PREMIERE_LIGNE, 1), cible.Worksheet.Cells(DERNIERE_LIGNE_MAX, NB_COL)))
    If zone Is Nothing Then Exit Sub
    If zone.CountLarge > 5000 Then Exit Sub
    For Each cellule In zone.Cells
        If cellule.Interior.Pattern <> xlNone Then
            Select Case cellule.Interior.Color
                Case COULEUR_ERREUR, COULEUR_DOUBLON, COULEUR_AVERT
                    Application.EnableEvents = False
                    cellule.Interior.Pattern = xlNone
                    If Not cellule.Comment Is Nothing Then cellule.Comment.Delete
                    Application.EnableEvents = True
            End Select
        End If
    Next cellule
End Sub

' ---------------------------------------------------------------------------------------------
' Feuille « Contrôle » : rapport regroupé par type
' ---------------------------------------------------------------------------------------------
Private Function FeuilleControle() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(NOM_CONTROLE)
    On Error GoTo 0
    If ws Is Nothing Then
        Dim actif As Object
        Set actif = ActiveSheet
        Set ws = ThisWorkbook.Worksheets.Add(After:=FeuilleTravail())
        ws.Name = NOM_CONTROLE
        On Error Resume Next          ' mise en forme seulement
        ws.Tab.Color = RGB(192, 0, 0)
        ActiveWindow.DisplayGridlines = False
        On Error GoTo 0
        ws.Columns("A").ColumnWidth = 16
        ws.Columns("B").ColumnWidth = 70
        ws.Columns("C").ColumnWidth = 100
        ws.Columns("C").WrapText = True
        ws.Columns("A:C").VerticalAlignment = xlTop
        ws.Rows("3:4").RowHeight = 18
        AjouterBouton ws, "btnVerifier", "Vérifier", "Verifier", 4, RGB(11, 92, 173)
        AjouterBouton ws, "btnCopier", "Copier le rapport d'erreurs", "CopierRapport", 120, RGB(192, 0, 0)
        AjouterBouton ws, "btnExporter", "Exporter import.csv", "ExporterCsv", 300, RGB(30, 123, 60)
        AjouterBouton ws, "btnRetour", "Retour au tableau", "RetourTableau", 450, RGB(90, 97, 112)
        If Not actif Is Nothing Then actif.Activate
    End If
    Set FeuilleControle = ws
End Function

Private Sub AjouterBouton(ws As Worksheet, ByVal nom As String, ByVal texte As String, ByVal macro As String, ByVal gauche As Single, ByVal couleur As Long)
    Dim sh As Shape
    On Error Resume Next          ' les mêmes actions restent disponibles dans le ruban
    Set sh = ws.Shapes.AddShape(5, gauche, ws.Rows(3).Top, Len(texte) * 7 + 30, 28)
    sh.Name = nom
    sh.OnAction = macro
    sh.Fill.ForeColor.RGB = couleur
    sh.Line.Visible = False
    sh.Placement = xlFreeFloating
    With sh.TextFrame2
        .TextRange.Text = texte
        .TextRange.Font.Size = 11
        .TextRange.Font.Bold = True
        .TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
        .TextRange.ParagraphFormat.Alignment = 2
        .VerticalAnchor = 3
    End With
End Sub

Public Sub RetourTableau()
    FeuilleTravail().Activate
End Sub

' Groupes : libellé, nombre, lignes (« L5, L9 (Titre, Picto) »)
Private Sub CalculerGroupes(ByVal niveauVoulu As String, ByRef nG As Long, gLabel() As String, gNombre() As Long, gLignes() As String, gNbLignes() As Long, gPremier() As Long, gPremiereCol() As Long)
    Dim i As Long, g As Long, j As Long, montrerCols As Boolean
    Dim gDerniere() As Long, gCols() As String
    nG = 0
    ReDim gLabel(1 To nbIss + 1): ReDim gNombre(1 To nbIss + 1): ReDim gLignes(1 To nbIss + 1): ReDim gNbLignes(1 To nbIss + 1)
    ReDim gPremier(1 To nbIss + 1): ReDim gPremiereCol(1 To nbIss + 1): ReDim gDerniere(1 To nbIss + 1): ReDim gCols(1 To nbIss + 1)
    For i = 1 To nbIss
        If (niveauVoulu = "warn") = (issNiveau(i) = "warn") Then
            g = 0
            For j = 1 To nG
                If gLabel(j) = issGroupe(i) Then g = j: Exit For
            Next j
            If g = 0 Then
                nG = nG + 1: g = nG
                gLabel(g) = issGroupe(i): gPremier(g) = issLigne(i): gPremiereCol(g) = issCol(i)
            End If
            montrerCols = (issType(i) = "req")
            gNombre(g) = gNombre(g) + 1
            If gDerniere(g) <> issLigne(i) Then
                If gCols(g) <> "" Then gLignes(g) = gLignes(g) & " (" & gCols(g) & ")"
                If gNbLignes(g) < MAX_LIGNES_AFFICHEES Then
                    If gLignes(g) <> "" Then gLignes(g) = gLignes(g) & ", "
                    gLignes(g) = gLignes(g) & "L" & issLigne(i)
                End If
                gCols(g) = ""
                gNbLignes(g) = gNbLignes(g) + 1
                gDerniere(g) = issLigne(i)
            End If
            If montrerCols And gNbLignes(g) <= MAX_LIGNES_AFFICHEES Then
                If gCols(g) <> "" Then gCols(g) = gCols(g) & ", "
                gCols(g) = gCols(g) & NomCourt(issCol(i))
            End If
        End If
    Next i
    For g = 1 To nG
        If gCols(g) <> "" Then gLignes(g) = gLignes(g) & " (" & gCols(g) & ")"
        If gNbLignes(g) > MAX_LIGNES_AFFICHEES Then gLignes(g) = gLignes(g) & " … et " & (gNbLignes(g) - MAX_LIGNES_AFFICHEES) & " autres lignes"
    Next g
    ' Tri : le type le plus fréquent d'abord
    Dim a As Long, b As Long
    For a = 1 To nG - 1
        For b = a + 1 To nG
            If gNombre(b) > gNombre(a) Or (gNombre(b) = gNombre(a) And (gPremier(b) < gPremier(a) Or (gPremier(b) = gPremier(a) And gPremiereCol(b) < gPremiereCol(a)))) Then
                EchangerS gLabel, a, b: EchangerS gLignes, a, b
                EchangerL gNombre, a, b: EchangerL gNbLignes, a, b: EchangerL gPremier, a, b: EchangerL gPremiereCol, a, b
            End If
        Next b
    Next a
End Sub

Private Sub EchangerS(t() As String, ByVal a As Long, ByVal b As Long)
    Dim x As String: x = t(a): t(a) = t(b): t(b) = x
End Sub

Private Sub EchangerL(t() As Long, ByVal a As Long, ByVal b As Long)
    Dim x As Long: x = t(a): t(a) = t(b): t(b) = x
End Sub

Private Function TitreRapport() As String
    If nbErreurs > 0 Then
        TitreRapport = Pluriel(nbErreurs, "erreur bloquante", "erreurs bloquantes") & " sur " & Pluriel(nbLignesErreur, "ligne", "lignes") & " : import.csv ne peut pas encore être exporté"
    ElseIf nbRessources > 0 Then
        TitreRapport = "Aucune erreur bloquante : " & Pluriel(nbRessources, "ressource prête", "ressources prêtes") & " pour import.csv"
    Else
        TitreRapport = "Le tableau est vide : cliquez sur « Lire le dossier » ou « Importer un fichier »."
    End If
End Function

Private Sub EcrireRapport()
    Dim ws As Worksheet, wt As Worksheet, r As Long, g As Long, nG As Long
    Dim gLabel() As String, gNombre() As Long, gLignes() As String, gNbLignes() As Long, gPremier() As Long, gPremiereCol() As Long
    Set ws = FeuilleControle()
    Set wt = FeuilleTravail()
    ws.Range("A1:C" & ws.Rows.Count).Clear
    On Error Resume Next
    ws.Hyperlinks.Delete
    On Error GoTo 0
    ws.Range("A1").Value = "Contrôle de l'import"
    ws.Range("A1").Font.Size = 16: ws.Range("A1").Font.Bold = True
    ws.Range("A2").Value = "Contrôlé " & MaintenantTexte() & ". Après vos corrections, cliquez à nouveau sur « Vérifier ». L = numéro de ligne dans l'onglet « " & wt.Name & " » ; cliquez sur un nombre pour aller à la première cellule concernée."
    ws.Range("A2").Font.Color = RGB(86, 97, 112)

    r = 6
    With ws.Range("A" & r & ":C" & r)
        .Merge
        .Value = TitreRapport()
        .Font.Bold = True: .Font.Size = 13
        .RowHeight = 24: .VerticalAlignment = xlCenter
        If nbErreurs > 0 Then
            .Interior.Color = RGB(253, 231, 233): .Font.Color = RGB(142, 0, 0)
        Else
            .Interior.Color = RGB(226, 245, 229): .Font.Color = RGB(27, 94, 32)
        End If
    End With
    r = r + 1
    ws.Range("A" & r).Value = InfoSources()
    ws.Range("A" & r).Font.Color = RGB(86, 97, 112)
    r = r + 2

    If nbErreurs > 0 Then
        ws.Range("A" & r).Value = "Erreurs bloquantes": ws.Range("A" & r).Font.Bold = True: ws.Range("A" & r).Font.Size = 12
        r = r + 1
        CalculerGroupes "err", nG, gLabel, gNombre, gLignes, gNbLignes, gPremier, gPremiereCol
        For g = 1 To nG
            EcrireGroupe ws, wt, r, Pluriel(gNombre(g), "erreur", "erreurs"), gLabel(g), gLignes(g), gPremier(g), gPremiereCol(g), RGB(142, 0, 0)
            r = r + 1
        Next g
        r = r + 1
    End If
    If nbAvertissements > 0 Then
        ws.Range("A" & r).Value = "Avertissements (non bloquants, à vérifier)": ws.Range("A" & r).Font.Bold = True: ws.Range("A" & r).Font.Size = 12
        r = r + 1
        CalculerGroupes "warn", nG, gLabel, gNombre, gLignes, gNbLignes, gPremier, gPremiereCol
        For g = 1 To nG
            EcrireGroupe ws, wt, r, Pluriel(gNombre(g), "avertissement", "avertissements"), gLabel(g), gLignes(g), gPremier(g), gPremiereCol(g), RGB(92, 68, 0)
            r = r + 1
        Next g
        r = r + 1
    End If

    ' Fichiers du dossier absents du tableau
    Dim noms As Collection, liste() As String, n As Long, absents As Variant, nAbs As Long, i As Long, txt As String
    On Error Resume Next
    ws.Shapes("btnAjouter").Delete
    On Error GoTo 0
    Set noms = NomsDuDossier(liste, n)
    If n > 0 Then
        absents = FichiersAbsentsPublic(wt, liste, n, nAbs)
        If nAbs > 0 Then
            ws.Range("A" & r).Value = Pluriel(nAbs, "fichier du dossier n'est pas", "fichiers du dossier ne sont pas") & " dans le tableau"
            ws.Range("A" & r).Font.Bold = True
            r = r + 1
            For i = 1 To nAbs
                If i > 200 Then txt = txt & " …": Exit For
                If txt <> "" Then txt = txt & ", "
                txt = txt & absents(i)
            Next i
            ws.Range("B" & r).Value = "Cliquez sur le bouton pour les ajouter à la fin du tableau."
            ws.Range("C" & r).Value = txt
            ws.Rows(r).RowHeight = 30
            Dim sh As Shape
            On Error Resume Next
            ws.Shapes("btnAjouter").Delete
            On Error GoTo 0
            Set sh = ws.Shapes.AddShape(5, ws.Range("A" & r).Left + 2, ws.Range("A" & r).Top + 3, ws.Range("A" & r).Width - 4, 22)
            sh.Name = "btnAjouter": sh.OnAction = "AjouterFichiersAbsents"
            sh.Fill.ForeColor.RGB = RGB(11, 92, 173): sh.Line.Visible = False
            sh.TextFrame2.TextRange.Text = "Ajouter les " & nAbs
            sh.TextFrame2.TextRange.Font.Size = 10: sh.TextFrame2.TextRange.Font.Bold = True
            sh.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
            sh.TextFrame2.TextRange.ParagraphFormat.Alignment = 2
        End If
    End If
End Sub

Private Sub EcrireGroupe(ws As Worksheet, wt As Worksheet, ByVal r As Long, ByVal nombre As String, ByVal libelle As String, ByVal lignes As String, ByVal premiere As Long, ByVal col As Long, ByVal couleur As Long)
    ws.Range("A" & r).Value = nombre
    On Error Resume Next          ' lien vers la première cellule concernée
    ws.Hyperlinks.Add Anchor:=ws.Range("A" & r), Address:="", SubAddress:="'" & wt.Name & "'!" & wt.Cells(premiere, col).Address(False, False), TextToDisplay:=nombre
    On Error GoTo 0
    ws.Range("A" & r).Font.Bold = True
    ws.Range("A" & r).Font.Color = couleur
    ws.Range("B" & r).Value = libelle
    ws.Range("B" & r).Font.Bold = True
    ws.Range("B" & r).WrapText = True
    ws.Range("C" & r).Value = lignes
End Sub

Public Function FichiersAbsentsPublic(ws As Worksheet, t As Variant, ByVal n As Long, ByRef nAbs As Long) As Variant
    FichiersAbsentsPublic = FichiersAbsents(ws, t, n, nAbs)
End Function

Private Function InfoSources() As String
    Dim wd As Worksheet, s As String, n As Long, nm As Name
    Set wd = FeuilleDossier(False)
    If Not wd Is Nothing Then
        If CStr(wd.Range("A1").Value) <> "" Then
            n = wd.Cells(wd.Rows.Count, 1).End(xlUp).Row - 1
            s = "Dernier dossier lu : « " & wd.Range("A1").Value & " » (" & Pluriel(n, "fichier", "fichiers") & ", le " & Format$(wd.Range("B1").Value, "dd/mm/yyyy à hh:nn") & ")."
        End If
    End If
    On Error Resume Next
    Set nm = ThisWorkbook.Names("_dernier_import")
    On Error GoTo 0
    If Not nm Is Nothing Then
        If s <> "" Then s = s & "   "
        s = s & "Dernier fichier importé : " & Mid$(nm.RefersTo, 3, Len(nm.RefersTo) - 3) & "."
    End If
    If s = "" Then s = "Aucun dossier lu : le contrôle de l'existence des fichiers est fait seulement après « Lire le dossier »."
    InfoSources = s
End Function

' ---------------------------------------------------------------------------------------------
' Copier le rapport (texte identique à la feuille « Contrôle » : titre + erreurs regroupées)
' ---------------------------------------------------------------------------------------------
Public Function TexteRapport() As String
    Dim t As String, g As Long, nG As Long
    Dim gLabel() As String, gNombre() As Long, gLignes() As String, gNbLignes() As Long, gPremier() As Long, gPremiereCol() As Long
    t = TitreRapport()
    If nbErreurs > 0 Then
        t = t & vbCrLf
        CalculerGroupes "err", nG, gLabel, gNombre, gLignes, gNbLignes, gPremier, gPremiereCol
        For g = 1 To nG
            t = t & vbCrLf & Pluriel(gNombre(g), "erreur", "erreurs") & " · " & gLabel(g) & " : " & gLignes(g)
        Next g
    End If
    TexteRapport = t
End Function

Public Sub CopierRapport()
    Verifier False
    Dim t As String
    t = TexteRapport()
    If CopierDansPressePapiers(t) Then
        MsgBox "Rapport copié : collez-le avec Ctrl+V dans un e-mail ou un message." & vbLf & vbLf & t, vbInformation, "Copier le rapport d'erreurs"
    Else
        InputBox "La copie automatique n'a pas fonctionné. Sélectionnez le texte ci-dessous et copiez-le avec Ctrl+C :", "Copier le rapport d'erreurs", Replace(t, vbCrLf, " | ")
    End If
End Sub

' ---------------------------------------------------------------------------------------------
' 3. Exporter import.csv (séparateur ¤, Latin-1, fins de ligne CRLF, 23 colonnes)
' ---------------------------------------------------------------------------------------------
Public Function TexteCsv(ws As Worksheet) As String
    Dim t As String, derniere As Long, donnees As Variant, r As Long, c As Long, sep As String, cellules() As String
    sep = ChrW(164)
    t = Join(EntetesCsv(), sep) & vbCrLf
    derniere = DerniereLigne(ws)
    If derniere < PREMIERE_LIGNE Then TexteCsv = t: Exit Function
    donnees = ws.Range(ws.Cells(1, 1), ws.Cells(derniere, NB_COL)).Value2
    ReDim cellules(1 To NB_COL)
    For r = PREMIERE_LIGNE To derniere
        If Not LigneVide(donnees, r) Then
            For c = 1 To NB_COL
                If c = COL_UUID Then
                    cellules(c) = ""
                ElseIf EstColonneFichier(c) Then
                    cellules(c) = NormFichier(TexteCellule(donnees(r, c)))
                Else
                    cellules(c) = NormTexte(TexteCellule(donnees(r, c)))
                End If
            Next c
            t = t & Join(cellules, sep) & vbCrLf
        End If
    Next r
    TexteCsv = t
End Function

Public Function OctetsLatin1(ByVal t As String) As Variant
    Dim b() As Byte, i As Long, code As Long
    ReDim b(0 To Len(t) - 1)
    For i = 1 To Len(t)
        code = CodeCar(Mid$(t, i, 1))
        If code > 255 Then Err.Raise vbObjectError + 1, , "Caractère non encodable en Latin-1 : " & Mid$(t, i, 1)
        b(i - 1) = code
    Next i
    OctetsLatin1 = b
End Function

Public Sub ExporterCsv()
    Dim ws As Worksheet, dossier As String, f As Variant, wd As Worksheet
    Set ws = FeuilleTravail()
    Verifier False
    If nbRessources = 0 Then MsgBox "Le tableau ne contient aucune ressource.", vbExclamation, "Exporter import.csv": Exit Sub
    If nbErreurs > 0 Then
        FeuilleControle().Activate
        MsgBox "Export impossible : " & TitreRapport() & "." & vbLf & vbLf & "Corrigez les erreurs listées dans l'onglet « Contrôle », puis exportez à nouveau.", vbExclamation, "Exporter import.csv"
        Exit Sub
    End If
    Set wd = FeuilleDossier(False)
    If Not wd Is Nothing Then dossier = CStr(wd.Range("A1").Value)
    If dossier = "" Then dossier = ThisWorkbook.Path
    If dossier <> "" Then
        If Right$(dossier, 1) <> "\" Then dossier = dossier & "\"
    End If
    f = Application.GetSaveAsFilename(InitialFileName:=dossier & "import.csv", FileFilter:="Fichier d'import (*.csv),*.csv", Title:="Enregistrer import.csv (à placer à la racine de l'archive, avec les fichiers)")
    If VarType(f) = vbBoolean Then Exit Sub
    If LCase$(NomSeul(CStr(f))) <> "import.csv" Then
        If MsgBox("Le fichier doit s'appeler exactement « import.csv » pour être accepté par l'import." & vbLf & "Enregistrer quand même sous le nom « " & NomSeul(CStr(f)) & " » ?", vbYesNo + vbExclamation, "Exporter import.csv") <> vbYes Then Exit Sub
    End If
    Dim existe As Boolean
    On Error Resume Next
    existe = Len(Dir$(CStr(f))) > 0
    On Error GoTo 0
    If existe Then
        If MsgBox("« " & f & " » existe déjà. Le remplacer ?", vbYesNo + vbQuestion, "Exporter import.csv") <> vbYes Then Exit Sub
    End If

    Dim octets() As Byte
    On Error GoTo Echec
    octets = OctetsLatin1(TexteCsv(ws))
    EcrireOctets CStr(f), octets
    On Error GoTo 0
    MsgBox "import.csv enregistré : " & Pluriel(nbRessources, "ressource", "ressources") & "." & vbLf & f & vbLf & vbLf & _
        "Placez-le à la racine de l'archive, avec les fichiers des ressources." & _
        IIf(nbAvertissements > 0, vbLf & "(" & Pluriel(nbAvertissements, "avertissement non bloquant", "avertissements non bloquants") & " : voir l'onglet « Contrôle ».)", ""), vbInformation, "Exporter import.csv"
    Exit Sub
Echec:
    MsgBox "import.csv n'a pas pu être enregistré : " & Err.Description, vbExclamation, "Exporter import.csv"
End Sub

Private Sub EcrireOctets(ByVal chemin As String, octets() As Byte)
    Dim flux As Object
    On Error Resume Next
    Set flux = CreateObject("ADODB.Stream")
    On Error GoTo 0
    If Not flux Is Nothing Then
        flux.Type = 1          ' binaire
        flux.Open
        flux.Write octets
        flux.SaveToFile chemin, 2   ' remplace le fichier s'il existe
        flux.Close
    Else
        Dim n As Integer
        If Len(Dir$(chemin)) > 0 Then Kill chemin
        n = FreeFile
        Open chemin For Binary Access Write As #n
        Put #n, , octets
        Close #n
    End If
End Sub

' ---------------------------------------------------------------------------------------------
' Supprimer les données (pour commencer un nouvel import)
' ---------------------------------------------------------------------------------------------
Public Sub SupprimerDonnees()
    If MsgBox("Supprimer toutes les données du tableau, le dossier lu et le rapport de contrôle, pour commencer un nouvel import ?" & vbLf & vbLf & _
        "Cette action est définitive (enregistrez une copie du classeur avant si vous voulez garder ce travail).", vbYesNo + vbExclamation + vbDefaultButton2, "Supprimer les données") <> vbYes Then Exit Sub
    Dim ws As Worksheet, wd As Worksheet, wc As Worksheet
    Application.ScreenUpdating = False
    Set ws = FeuilleTravail()
    Application.EnableEvents = False
    ws.Range(ws.Cells(PREMIERE_LIGNE, 1), ws.Cells(DERNIERE_LIGNE_MAX, NB_COL)).ClearContents
    Application.EnableEvents = True
    EffacerMarques ws
    Set wd = FeuilleDossier(False)
    If Not wd Is Nothing Then wd.Cells.Clear
    On Error Resume Next
    ThisWorkbook.Names("_dernier_import").Delete
    Set wc = ThisWorkbook.Worksheets(NOM_CONTROLE)
    On Error GoTo 0
    If Not wc Is Nothing Then
        Application.DisplayAlerts = False
        wc.Delete
        Application.DisplayAlerts = True
    End If
    ws.Activate
    ws.Range("A2").Select
    Application.ScreenUpdating = True
    MsgBox "Données supprimées. Vous pouvez commencer un nouvel import.", vbInformation, "Supprimer les données"
End Sub

Public Sub EffacerBarreEtat()
    Application.StatusBar = False
End Sub
