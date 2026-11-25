Attribute VB_Name = "Comparaison"
' Comparer le fichier et les ressources : un fichier d'import (Excel ou CSV) et le dossier des
' fichiers médias contiennent-ils le même nombre de fichiers, nommés à l'identique ?
' Le résultat s'affiche dans l'onglet « Comparaison » ; le tableau de travail n'est pas modifié.
Option Explicit

Private Const NOM_FEUILLE As String = "Comparaison"
Private Const TITRE As String = "Comparer le fichier et les ressources"

Public Sub ComparerFichierEtRessources()
    Dim fd As Object, dossier As String, fichier As String
    Set fd = Application.FileDialog(4)   ' sélecteur de dossier
    fd.Title = "Choisir le dossier qui contient les fichiers médias et le fichier d'import (Excel ou CSV)"
    fd.AllowMultiSelect = False
    If fd.Show <> -1 Then Exit Sub
    dossier = fd.SelectedItems(1)
    fichier = ChoisirFichierImport(dossier)
    If fichier = "" Then Exit Sub

    ' Le fichier d'import
    Dim matrice As Collection, ou As String, notes As String, lignes As Collection
    On Error GoTo Illisible
    Set matrice = LireFichierImport(fichier, ou)
    On Error GoTo 0
    Set lignes = PreparerLignes(matrice, notes)

    ' Les fichiers du dossier (sous-dossiers compris), sans le fichier d'import ni ce classeur
    Dim fso As Object, noms As Collection, nbSous As Long, nbIgnores As Long, nbDoublons As Long, exemple As String
    Set noms = New Collection
    Application.StatusBar = "Lecture du dossier…"
    Set fso = CreateObject("Scripting.FileSystemObject")
    ParcourirDossier fso.GetFolder(dossier), "", noms, nbSous, nbIgnores, nbDoublons, exemple
    Application.StatusBar = False
    Dim liste() As String, n As Long, item As Variant, memeDossier As Boolean
    memeDossier = (LCase$(fso.GetParentFolderName(fichier)) = LCase$(dossier))
    ReDim liste(1 To noms.Count + 1)
    For Each item In noms
        If Not (memeDossier And item = NomDeFichier(fichier)) And item <> ThisWorkbook.Name Then
            n = n + 1: liste(n) = item
        End If
    Next item

    Dim infos As String
    infos = "Dossier « " & dossier & " » ; fichier « " & NomDeFichier(fichier) & " » (" & ou & ")."
    If nbSous > 0 Then infos = infos & " " & Pluriel(nbSous, "fichier est dans un sous-dossier", "fichiers sont dans des sous-dossiers") & " : ils doivent être à la racine de l'archive."
    If nbIgnores > 0 Then infos = infos & " " & Pluriel(nbIgnores, "fichier système ignoré", "fichiers système ignorés") & "."

    Dim ws As Worksheet, nManquants As Long, nEnTrop As Long, nAttendus As Long
    Application.ScreenUpdating = False
    Set ws = FeuilleComparaison()
    EcrireComparaison ws, lignes, liste, n, infos, nManquants, nEnTrop, nAttendus
    Application.ScreenUpdating = True
    ws.Activate
    If nManquants = 0 And nEnTrop = 0 Then
        MsgBox "Le fichier et le dossier correspondent : " & Pluriel(nAttendus, "fichier", "fichiers") & ", tous nommés à l'identique.", vbInformation, TITRE
    Else
        MsgBox "Différences entre le fichier et le dossier :" & vbLf & _
            "• " & Pluriel(nManquants, "fichier listé est introuvable", "fichiers listés sont introuvables") & " dans le dossier ;" & vbLf & _
            "• " & Pluriel(nEnTrop, "fichier du dossier n'est pas listé", "fichiers du dossier ne sont pas listés") & " dans le fichier." & vbLf & vbLf & _
            "Le détail est dans l'onglet « Comparaison ».", vbExclamation, TITRE
    End If
    Exit Sub
Illisible:
    Application.ScreenUpdating = True
    MsgBox "« " & fichier & " » n'a pas pu être lu (" & Err.Description & ").", vbExclamation, TITRE
End Sub

' Le fichier d'import du dossier : proposé s'il est seul, sinon choisi par l'utilisateur
Private Function ChoisirFichierImport(ByVal dossier As String) As String
    Dim fso As Object, f As Object, trouves As Collection, e As String
    Set trouves = New Collection
    Set fso = CreateObject("Scripting.FileSystemObject")
    For Each f In fso.GetFolder(dossier).Files
        e = Extension(f.Name)
        If (e = "csv" Or e = "xlsx" Or e = "xlsm" Or e = "xls") And Left$(f.Name, 2) <> "~$" And LCase$(f.Path) <> LCase$(ThisWorkbook.FullName) Then
            trouves.Add f.Path
        End If
    Next f
    If trouves.Count = 1 Then
        Select Case MsgBox("Comparer le dossier avec le fichier « " & NomDeFichier(trouves(1)) & " » ?" & vbLf & vbLf & _
            "Oui : utiliser ce fichier." & vbLf & "Non : choisir un autre fichier.", vbYesNoCancel + vbQuestion, TITRE)
            Case vbYes: ChoisirFichierImport = trouves(1): Exit Function
            Case vbCancel: Exit Function
        End Select
    End If
    Dim fp As Object
    Set fp = Application.FileDialog(3)   ' sélecteur de fichier
    If trouves.Count = 0 Then
        fp.Title = "Aucun fichier Excel ou CSV dans ce dossier : choisir le fichier d'import à comparer"
    Else
        fp.Title = "Choisir le fichier d'import (Excel ou CSV) à comparer"
    End If
    fp.AllowMultiSelect = False
    fp.Filters.Clear
    fp.Filters.Add "Fichier d'import", "*.csv;*.xlsx;*.xlsm;*.xls"
    fp.InitialFileName = dossier & "\"
    If fp.Show <> -1 Then Exit Function
    ChoisirFichierImport = fp.SelectedItems(1)
End Function

Private Function NomDeFichier(ByVal chemin As String) As String
    NomDeFichier = Mid$(chemin, InStrRev(Replace(chemin, "/", "\"), "\") + 1)
End Function

Private Function FeuilleComparaison() As Worksheet
    Dim ws As Worksheet, actif As Object
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(NOM_FEUILLE)
    On Error GoTo 0
    If ws Is Nothing Then
        Set actif = ActiveSheet
        Set ws = ThisWorkbook.Worksheets.Add(After:=FeuilleTravail())
        ws.Name = NOM_FEUILLE
        On Error Resume Next          ' mise en forme seulement
        ws.Tab.Color = RGB(30, 123, 60)
        ActiveWindow.DisplayGridlines = False
        On Error GoTo 0
        If Not actif Is Nothing Then actif.Activate
    End If
    Set FeuilleComparaison = ws
End Function

' Compare les fichiers attendus d'après les lignes du fichier d'import (colonne A et fichiers
' associés M, N, O, T) avec les fichiers du dossier (liste(1..n)), et écrit le résultat.
Public Sub EcrireComparaison(ws As Worksheet, lignes As Collection, liste As Variant, ByVal n As Long, ByVal infos As String, _
        ByRef nManquants As Long, ByRef nEnTrop As Long, ByRef nAttendus As Long)
    Dim dossierParBas As Collection, utilises As Collection, vus As Collection
    Set dossierParBas = New Collection
    Set utilises = New Collection
    Set vus = New Collection
    Dim i As Long, j As Long, c As Variant, valeurs As Variant, nom As String, exact As String, sugg As String
    Dim nUrl As Long, nDoublonsListe As Long, nInterdits As Long, deja As String
    Dim manqNom() As String, manqCol() As String, manqRes() As Long, manqSugg() As String
    ReDim manqNom(1 To 1): ReDim manqCol(1 To 1): ReDim manqRes(1 To 1): ReDim manqSugg(1 To 1)
    nManquants = 0: nEnTrop = 0: nAttendus = 0

    For i = 1 To n
        On Error Resume Next
        dossierParBas.Add liste(i), LCase$(liste(i))
        On Error GoTo 0
    Next i

    For i = 1 To lignes.Count
        valeurs = lignes(i)
        For Each c In Array(1, 13, 14, 15, 20)
            nom = NormFichier(valeurs(c))
            If nom <> "" Then
                If c = 1 And (LCase$(Left$(nom, 7)) = "http://" Or LCase$(Left$(nom, 8)) = "https://") Then
                    nUrl = nUrl + 1
                Else
                    deja = ""
                    On Error Resume Next
                    deja = vus(LCase$(nom))
                    On Error GoTo 0
                    If deja <> "" Then
                        nDoublonsListe = nDoublonsListe + 1
                    Else
                        vus.Add nom, LCase$(nom)
                        nAttendus = nAttendus + 1
                        If Not EstAscii(nom) Or InStr(nom, " ") > 0 Then nInterdits = nInterdits + 1
                        exact = ""
                        On Error Resume Next
                        exact = dossierParBas(LCase$(nom))
                        On Error GoTo 0
                        If exact = nom Then
                            utilises.Add nom, LCase$(nom)
                        Else
                            If exact <> "" Then
                                sugg = "Majuscules / minuscules différentes : « " & exact & " »"
                                utilises.Add exact, LCase$(exact)
                            Else
                                sugg = PlusProche(nom, liste, n)
                                If sugg <> "" Then sugg = "Vouliez-vous dire « " & sugg & " » ?"
                            End If
                            nManquants = nManquants + 1
                            If nManquants > UBound(manqNom) Then
                                ReDim Preserve manqNom(1 To nManquants * 2): ReDim Preserve manqCol(1 To nManquants * 2)
                                ReDim Preserve manqRes(1 To nManquants * 2): ReDim Preserve manqSugg(1 To nManquants * 2)
                            End If
                            manqNom(nManquants) = nom: manqCol(nManquants) = Mid$("ABCDEFGHIJKLMNOPQRSTUVW", c, 1)
                            manqRes(nManquants) = i: manqSugg(nManquants) = sugg
                        End If
                    End If
                End If
            End If
        Next c
    Next i

    Dim enTrop() As String
    ReDim enTrop(1 To n + 1)
    For i = 1 To n
        exact = ""
        On Error Resume Next
        exact = utilises(LCase$(liste(i)))
        On Error GoTo 0
        If exact = "" Then nEnTrop = nEnTrop + 1: enTrop(nEnTrop) = liste(i)
    Next i

    ' --- Écriture ---
    Dim r As Long
    ws.Range("A1:D" & ws.Rows.Count).Clear
    ws.Columns("A").ColumnWidth = 58
    ws.Columns("B").ColumnWidth = 12
    ws.Columns("C").ColumnWidth = 14
    ws.Columns("D").ColumnWidth = 60
    ws.Range("A1").Value = "Comparaison du fichier et des ressources"
    ws.Range("A1").Font.Size = 16: ws.Range("A1").Font.Bold = True
    ws.Range("A2").Value = "Comparé " & MaintenantTexte() & ". " & infos
    ws.Range("A2").Font.Color = RGB(86, 97, 112)

    With ws.Range("A4:D4")
        .Merge
        If nManquants = 0 And nEnTrop = 0 Then
            .Value = "Le fichier et le dossier correspondent : " & Pluriel(nAttendus, "fichier", "fichiers") & ", tous nommés à l'identique."
            .Interior.Color = RGB(226, 245, 229): .Font.Color = RGB(27, 94, 32)
        Else
            .Value = "Différences : " & Pluriel(nManquants, "fichier listé introuvable", "fichiers listés introuvables") & " dans le dossier, " & _
                Pluriel(nEnTrop, "fichier du dossier non listé", "fichiers du dossier non listés") & " dans le fichier."
            .Interior.Color = RGB(253, 231, 233): .Font.Color = RGB(142, 0, 0)
        End If
        .Font.Bold = True: .Font.Size = 13
        .RowHeight = 24: .VerticalAlignment = xlCenter
    End With

    r = 6
    LigneChiffre ws, r, "Ressources listées dans le fichier", lignes.Count, IIf(nUrl > 0, "dont " & Pluriel(nUrl, "adresse web", "adresses web") & " (pas de fichier attendu)", "")
    LigneChiffre ws, r + 1, "Fichiers attendus (colonne A et fichiers associés M, N, O, T)", nAttendus, ""
    LigneChiffre ws, r + 2, "Fichiers dans le dossier", n, ""
    If n = nAttendus Then
        LigneChiffre ws, r + 3, "Écart", 0, "même nombre de fichiers"
    ElseIf n > nAttendus Then
        LigneChiffre ws, r + 3, "Écart", n - nAttendus, "fichier(s) de plus dans le dossier"
    Else
        LigneChiffre ws, r + 3, "Écart", nAttendus - n, "fichier(s) de moins dans le dossier"
    End If
    r = r + 5
    If nDoublonsListe > 0 Then
        ws.Range("A" & r).Value = "• " & Pluriel(nDoublonsListe, "nom apparaît", "noms apparaissent") & " plusieurs fois dans le fichier (interdit)."
        r = r + 1
    End If
    If nInterdits > 0 Then
        ws.Range("A" & r).Value = "• " & Pluriel(nInterdits, "nom contient", "noms contiennent") & " un espace ou un accent (interdit) : utilisez « Vérifier un fichier » pour le détail."
        r = r + 1
    End If
    r = r + 1

    EnTete ws, r, "Listés dans le fichier mais introuvables dans le dossier (" & nManquants & ")"
    r = r + 1
    If nManquants = 0 Then
        ws.Range("A" & r).Value = "Aucun."
        r = r + 1
    Else
        ws.Range("A" & r & ":D" & r).Value = Array("Nom dans le fichier", "Colonne", "Ressource n°", "Suggestion")
        ws.Range("A" & r & ":D" & r).Font.Bold = True
        ws.Range("A" & r & ":D" & r).Interior.Color = RGB(217, 217, 217)
        r = r + 1
        For j = 1 To nManquants
            ws.Cells(r, 1).Value = manqNom(j)
            ws.Cells(r, 2).Value = manqCol(j)
            ws.Cells(r, 3).Value = manqRes(j)
            ws.Cells(r, 4).Value = manqSugg(j)
            r = r + 1
        Next j
    End If
    r = r + 1
    EnTete ws, r, "Dans le dossier mais absents du fichier (" & nEnTrop & ")"
    r = r + 1
    If nEnTrop = 0 Then
        ws.Range("A" & r).Value = "Aucun."
    Else
        For j = 1 To nEnTrop
            ws.Cells(r, 1).Value = enTrop(j)
            r = r + 1
        Next j
    End If
    ws.Columns("A:D").VerticalAlignment = xlTop
End Sub

Private Sub LigneChiffre(ws As Worksheet, ByVal r As Long, ByVal libelle As String, ByVal valeur As Long, ByVal remarque As String)
    ws.Cells(r, 1).Value = libelle
    ws.Cells(r, 2).Value = valeur
    ws.Cells(r, 2).Font.Bold = True
    ws.Cells(r, 2).HorizontalAlignment = xlCenter
    ws.Cells(r, 3).Value = remarque
End Sub

Private Sub EnTete(ws As Worksheet, ByVal r As Long, ByVal texte As String)
    ws.Cells(r, 1).Value = texte
    ws.Cells(r, 1).Font.Bold = True
    ws.Cells(r, 1).Font.Size = 12
End Sub
