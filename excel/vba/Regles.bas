Attribute VB_Name = "Regles"
' Règles de contrôle du fichier d'import : les mêmes que celles de l'outil web
' (generateur-import-csv.html). Une erreur bloquante empêche l'export d'import.csv.
Option Explicit

Public Const NB_COL As Long = 23          ' colonnes A à W
Public Const COL_UUID As Long = 23        ' W : toujours vide dans import.csv
Public Const PREMIERE_LIGNE As Long = 2
Public Const DERNIERE_LIGNE_MAX As Long = 2000   ' le modèle est préparé jusqu'à la ligne 2000
Public Const AUTEUR_NOTE As String = "Contrôle import"

Public Const COULEUR_ERREUR As Long = &H9999FF    ' rouge clair (comme le modèle)
Public Const COULEUR_DOUBLON As Long = &HA5FF&    ' orange
Public Const COULEUR_AVERT As Long = &HFFFF&      ' jaune

' Résultats du dernier contrôle
Public nbIss As Long
Public issLigne() As Long, issCol() As Long, issNiveau() As String, issMsg() As String, issGroupe() As String, issType() As String
Public nbRessources As Long, nbErreurs As Long, nbAvertissements As Long, nbLignesErreur As Long

' ---------------------------------------------------------------------------------------------
' Listes de valeurs (onglets « pictos » et « AIDE » du modèle)
' ---------------------------------------------------------------------------------------------
Public Function Pictos() As Variant
    Pictos = Array("aide", "anime_int", "audio", "audio_classe", "bibliographie", "biographie", "BO", "calculatrice_1", _
        "calculatrice_2", "carte", "carte_int", "correction", "dictee", "DYS", "eleve", "espace", "evaluation", "expérience", _
        "figure", "frise", "graphique", "image", "impression", "jeux", "karaoke", "livre", "microscope", "molecule", "musique", _
        "orchestre", "organigram", "outils", "outils_2", "Peinture", "photocopie", "pouce", "prof", "site", "tableau", "test", _
        "texte", "texte_lu", "theatre", "tice", "video", "video_classe")
End Function

Public Function ListeColonne(ByVal c As Long) As Variant
    Select Case c
        Case 4, 12, 17, 18: ListeColonne = Array("0", "1")
        Case 10: ListeColonne = Pictos()
        Case 11: ListeColonne = Array("ANONYME", "ENS", "PRESCRIPT", "ELE", "ETU")
        Case 16: ListeColonne = Array("DE", "EN", "ES", "FR", "IT", "LA", "PT", "RU")
        Case 21: ListeColonne = Array("extrait", "nouveau")
        Case Else: ListeColonne = Empty
    End Select
End Function

Public Function EstObligatoire(ByVal c As Long) As Boolean
    Select Case c
        Case 1, 2, 5, 8, 10, 11, 12, 16, 17, 18: EstObligatoire = True
    End Select
End Function

Public Function EstColonneFichier(ByVal c As Long) As Boolean
    Select Case c
        Case 1, 13, 14, 15, 20: EstColonneFichier = True
    End Select
End Function

Public Function ExtensionsAttendues(ByVal c As Long) As Variant
    Select Case c
        Case 13: ExtensionsAttendues = Array("mp3")
        Case 14: ExtensionsAttendues = Array("vtt")
        Case 15: ExtensionsAttendues = Array("pdf", "doc")
        Case 20: ExtensionsAttendues = Array("jpg", "jpeg")
    End Select
End Function

Public Function NomColonne(ByVal c As Long) As String
    NomColonne = Choose(c, "Nom du fichier (extension comprise)", "Titre de la ressource", "Titre alternatif", "Applet (0/1)", _
        "Niveau principal", "Sous-niveau", "Sous-sous-niveau", "Catégorie", "Description", "Picto", "Profil", _
        "Téléchargement autorisé (0/1)", "Audiodescription (.mp3)", "Sous-titres (.vtt)", "Transcription (.pdf/.doc)", "Langue", _
        "Intégrale livre du prof. (0/1)", "Fichier présentation méthode (0/1)", "N° de page", "Miniature vidéo (.jpg 310×220)", _
        "Watermark", "iFrame (L/H)", "uuid")
End Function

Public Function NomCourt(ByVal c As Long) As String
    NomCourt = Choose(c, "Nom du fichier", "Titre", "Titre alternatif", "Applet", "Niveau principal", "Sous-niveau", _
        "Sous-sous-niveau", "Catégorie", "Description", "Picto", "Profil", "Téléchargement", "Audiodescription", "Sous-titres", _
        "Transcription", "Langue", "Intégrale prof.", "Méthode", "N° de page", "Miniature", "Watermark", "iFrame", "uuid")
End Function

' En-têtes de import.csv : strictement identiques à l'exemple fourni (espaces compris)
Public Function EntetesCsv() As Variant
    EntetesCsv = Array("Nom du fichier (extension comprise)", "Titre de la ressource", "Titre alternatif", "Applet", _
        "Niveau principal  (Matière, chapitre, unité)", "Sous-niveau", "Sous-sous-niveau", "Catégorie", _
        "Description de la ressource", "Picto", "Profil", "Téléchargement autorisé (0 = non, 1 = oui", _
        "Fichier audio description (nom_du_fichier.mp3)", "Fichier sous titre (nom_du_fichier.vtt)", _
        "Transcription (nom_du_fichier.pdf ou .doc)", "Langue", "Intégrale du livre du professeur ? ", _
        "Fichier lié à la présentation de la méthode", "N° de page", _
        "Miniature vidéo (nom_du_fichier.jpg) - 310*220px", "watermark sur la ressource (extrait, nouveau)", _
        "Largeur/Hauteur de l'iFrame en pixels (L/H)", "uuid")
End Function

' ---------------------------------------------------------------------------------------------
' Accès à la feuille de travail
' ---------------------------------------------------------------------------------------------
Public Function FeuilleTravail() As Worksheet
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If LCase$(Left$(CStr(ws.Range("A1").Value), 14)) = "nom du fichier" Then Set FeuilleTravail = ws: Exit Function
    Next ws
    Set FeuilleTravail = ThisWorkbook.Worksheets(1)
End Function

Public Function TexteCellule(ByVal v As Variant) As String
    If IsError(v) Then
        TexteCellule = "#ERREUR"
    ElseIf IsEmpty(v) Then
        TexteCellule = ""
    Else
        TexteCellule = CStr(v)
    End If
End Function

' Dernière ligne remplie (colonnes A à V), au moins PREMIERE_LIGNE - 1
Public Function DerniereLigne(ws As Worksheet) As Long
    Dim c As Long, r As Long, m As Long
    m = PREMIERE_LIGNE - 1
    For c = 1 To NB_COL - 1
        r = ws.Cells(ws.Rows.Count, c).End(xlUp).Row
        If r > m Then m = r
    Next c
    If m > ws.Rows.Count - 1 Then m = PREMIERE_LIGNE - 1
    DerniereLigne = m
End Function

Public Function LigneVide(donnees As Variant, ByVal r As Long) As Boolean
    Dim c As Long
    For c = 1 To NB_COL - 1
        If TrimTout(TexteCellule(donnees(r, c))) <> "" Then Exit Function
    Next c
    LigneVide = True
End Function

' ---------------------------------------------------------------------------------------------
' Le contrôle
' ---------------------------------------------------------------------------------------------
Private Sub Ajouter(ByVal ligne As Long, ByVal col As Long, ByVal niveau As String, ByVal msg As String, ByVal typ As String, ByVal groupe As String)
    nbIss = nbIss + 1
    If nbIss > UBound(issLigne) Then
        ReDim Preserve issLigne(1 To nbIss * 2): ReDim Preserve issCol(1 To nbIss * 2)
        ReDim Preserve issNiveau(1 To nbIss * 2): ReDim Preserve issMsg(1 To nbIss * 2)
        ReDim Preserve issGroupe(1 To nbIss * 2): ReDim Preserve issType(1 To nbIss * 2)
    End If
    issLigne(nbIss) = ligne: issCol(nbIss) = col: issNiveau(nbIss) = niveau
    issMsg(nbIss) = msg: issType(nbIss) = typ: issGroupe(nbIss) = groupe
End Sub

' Contrôle toutes les lignes de la feuille de travail. Renvoie le nombre d'erreurs bloquantes.
Public Function Controler(ws As Worksheet) As Long
    Dim derniere As Long, donnees As Variant, r As Long, c As Long, v() As String
    nbIss = 0: nbRessources = 0
    ReDim issLigne(1 To 64): ReDim issCol(1 To 64): ReDim issNiveau(1 To 64)
    ReDim issMsg(1 To 64): ReDim issGroupe(1 To 64): ReDim issType(1 To 64)

    derniere = DerniereLigne(ws)
    If derniere < PREMIERE_LIGNE Then
        nbErreurs = 0: nbAvertissements = 0: nbLignesErreur = 0
        Controler = 0
        Exit Function
    End If
    donnees = ws.Range(ws.Cells(1, 1), ws.Cells(derniere, NB_COL)).Value2

    Dim nomsDossier As Collection, nbDossier As Long, listeDossier() As String
    Set nomsDossier = NomsDuDossier(listeDossier, nbDossier)

    Dim fichiers As New Collection, titres As New Collection
    ReDim v(1 To NB_COL)
    Dim liste As Variant, trouve As Boolean, i As Long, msg As String, groupe As String, sugg As String, cv As Variant

    For r = PREMIERE_LIGNE To derniere
        If Not LigneVide(donnees, r) Then
            nbRessources = nbRessources + 1
            For c = 1 To NB_COL
                If EstColonneFichier(c) Then v(c) = NormFichier(TexteCellule(donnees(r, c))) Else v(c) = NormTexte(TexteCellule(donnees(r, c)))
            Next c

            ' Colonnes obligatoires
            For c = 1 To NB_COL
                If EstObligatoire(c) And v(c) = "" Then
                    If Not (c = 5 And TitreSansNiveau(v(2))) Then
                        Ajouter r, c, "err", NomColonne(c) & " : obligatoire, la cellule est vide.", "req", "Colonne obligatoire vide"
                    End If
                End If
            Next c

            ' Valeurs des listes
            For c = 1 To NB_COL
                liste = ListeColonne(c)
                If Not IsEmpty(liste) And v(c) <> "" Then
                    trouve = False
                    For i = LBound(liste) To UBound(liste)
                        If liste(i) = v(c) Then trouve = True: Exit For
                    Next i
                    If Not trouve Then
                        sugg = ""
                        For i = LBound(liste) To UBound(liste)
                            If LCase$(liste(i)) = LCase$(v(c)) Then sugg = liste(i): Exit For
                        Next i
                        If c = 4 Or c = 12 Or c = 17 Or c = 18 Then
                            If LCase$(v(c)) = "o" Then
                                msg = NomColonne(c) & " : « " & v(c) & " » est la lettre O ; il faut le chiffre 0 (ou 1)."
                            Else
                                msg = NomColonne(c) & " : « " & v(c) & " » n'est pas accepté ; seulement le chiffre 0 (non) ou 1 (oui)."
                            End If
                            groupe = NomColonne(c) & " : seulement le chiffre 0 (non) ou 1 (oui)"
                        ElseIf sugg <> "" Then
                            msg = NomColonne(c) & " : écrire exactement « " & sugg & " » (majuscules / minuscules)."
                            groupe = ValeurHorsListeGroupe(c)
                        ElseIf c = 10 Then
                            sugg = PlusProche(v(c), Pictos1(), 46)
                            msg = "Picto : « " & v(c) & " » n'est pas dans la liste des pictos."
                            If sugg <> "" Then msg = msg & " Vouliez-vous dire « " & sugg & " » ?" Else msg = msg & " Choisir dans le menu déroulant."
                            groupe = ValeurHorsListeGroupe(c)
                        Else
                            msg = NomColonne(c) & " : « " & v(c) & " » n'est pas dans la liste (" & Join(liste, ", ") & ")."
                            groupe = ValeurHorsListeGroupe(c)
                        End If
                        Ajouter r, c, "err", msg, "list", groupe
                    End If
                End If
            Next c

            ' Nom du fichier (colonne A)
            If v(1) <> "" Then
                If LCase$(Left$(v(1), 7)) = "http://" Or LCase$(Left$(v(1), 8)) = "https://" Then
                    If Left$(v(1), 8) <> "https://" Then
                        Ajouter r, 1, "err", "Nom du fichier : une adresse web doit commencer par « https:// ».", "format", "Nom du fichier : une adresse web doit commencer par « https:// »"
                    ElseIf ContientEspace(v(1)) Then
                        Ajouter r, 1, "err", "Nom du fichier : l'adresse web contient un espace.", "format", "Nom du fichier : l'adresse web contient un espace"
                    End If
                Else
                    ControlerNomFichier r, 1, v(1)
                    If Extension(v(1)) = "" Or Left$(v(1), 1) = "." And InStr(2, v(1), ".") = 0 Then
                        Ajouter r, 1, "err", "Nom du fichier : l'extension manque (ex. « .pdf », « .mp4 ») — ou indiquer une adresse commençant par https://.", "format", _
                            "Nom du fichier : l'extension manque (ex. « .pdf », « .mp4 »), ou adresse https:// attendue"
                    End If
                    If nbDossier > 0 Then ControlerDansDossier r, 1, v(1), nomsDossier, listeDossier, nbDossier
                End If
                AjouterLigneCle fichiers, LCase$(v(1)), r
            End If

            ' Fichiers associés (audio, sous-titres, transcription, miniature)
            For Each cv In Array(13, 14, 15, 20)
                c = CLng(cv)
                If v(c) <> "" Then
                    If LCase$(Left$(v(c), 7)) = "http://" Or LCase$(Left$(v(c), 8)) = "https://" Then
                        Ajouter r, c, "warn", NomColonne(c) & " : un nom de fichier est attendu, pas une adresse web.", "format", NomColonne(c) & " : un nom de fichier est attendu, pas une adresse web"
                    Else
                        ControlerNomFichier r, c, v(c)
                        liste = ExtensionsAttendues(c)
                        trouve = False
                        For i = LBound(liste) To UBound(liste)
                            If Extension(v(c)) = liste(i) Then trouve = True
                        Next i
                        If Not trouve Then
                            msg = NomColonne(c) & " : extension attendue ." & Join(liste, " ou .")
                            If Extension(v(c)) <> "" Then msg = msg & " (ici ." & Extension(v(c)) & ")"
                            Ajouter r, c, "warn", msg & ".", "ext", NomColonne(c) & " : extension attendue ." & Join(liste, " ou .")
                        End If
                        If nbDossier > 0 Then ControlerDansDossier r, c, v(c), nomsDossier, listeDossier, nbDossier
                    End If
                End If
            Next cv

            ' iFrame : largeur/hauteur
            If v(22) <> "" And Not EstLargeurHauteur(v(22)) Then
                Ajouter r, 22, "warn", "iFrame : format attendu largeur/hauteur en pixels, par exemple 800/600 (ici « " & v(22) & " »).", "format", _
                    "iFrame : format attendu largeur/hauteur en pixels, par exemple 800/600"
            End If

            If v(2) <> "" Then AjouterLigneCle titres, LCase$(v(2)), r

            ' Caractères que l'import (Latin-1) ne sait pas enregistrer
            Dim hors As Collection, ch As Variant, txt As String, illisible As Boolean
            For c = 1 To NB_COL - 1
                If Not EstColonneFichier(c) Then
                    Set hors = CaracteresHors(v(c), 255)
                    If hors.Count > 0 Then
                        txt = "": illisible = False
                        For Each ch In hors
                            If txt <> "" Then txt = txt & ", "
                            txt = txt & "« " & ch & " » (" & CodeUnicode(ch)
                            If NomCaractere(ch) <> "" Then txt = txt & ", " & NomCaractere(ch)
                            txt = txt & ")"
                            If CodeCar(ch) = 65533 Then illisible = True
                        Next ch
                        msg = NomColonne(c) & " : caractère" & IIf(hors.Count > 1, "s", "") & " non accepté" & IIf(hors.Count > 1, "s", "") & " par l'import : " & txt & "."
                        If illisible Then
                            msg = msg & " Ce signe remplace une lettre perdue lors d'une conversion (copier-coller depuis un PDF ou un site, fichier mal encodé) : c'était souvent un accent ou une apostrophe. Retapez le mot concerné."
                        Else
                            msg = msg & " À remplacer ou supprimer."
                        End If
                        Ajouter r, c, "err", msg, "latin1", NomColonne(c) & " : caractère non accepté par l'import (à retaper ou supprimer)"
                    End If
                End If
            Next c
        End If
    Next r

    ' Doublons
    Dim item As Variant, lignes As Variant, k As Long, liste2 As String
    For Each item In fichiers
        lignes = Split(item, ",")
        If UBound(lignes) > 0 Then
            liste2 = Join(lignes, ", ")
            For k = 0 To UBound(lignes)
                Ajouter CLng(lignes(k)), 1, "dup", "Nom du fichier en double (lignes " & liste2 & ") : interdit, chaque fichier ne doit apparaître qu'une fois.", "dup", _
                    "Nom du fichier en double : interdit, chaque fichier ne doit apparaître qu'une fois"
            Next k
        End If
    Next item
    For Each item In titres
        lignes = Split(item, ",")
        If UBound(lignes) > 0 Then
            liste2 = Join(lignes, ", ")
            For k = 0 To UBound(lignes)
                Ajouter CLng(lignes(k)), 2, "warn", "Titre identique sur les lignes " & liste2 & " : autorisé, à vérifier.", "duptitle", _
                    "Titre identique sur plusieurs lignes : autorisé, à vérifier"
            Next k
        End If
    Next item

    ' Totaux
    Dim lignesErr As New Collection
    nbErreurs = 0: nbAvertissements = 0
    For i = 1 To nbIss
        If issNiveau(i) = "warn" Then
            nbAvertissements = nbAvertissements + 1
        Else
            nbErreurs = nbErreurs + 1
            On Error Resume Next
            lignesErr.Add issLigne(i), CStr(issLigne(i))
            On Error GoTo 0
        End If
    Next i
    nbLignesErreur = lignesErr.Count
    Controler = nbErreurs
End Function

Private Function Pictos1() As Variant
    ' même liste, indices 1 à 46 (pour PlusProche)
    Dim p As Variant, t() As String, i As Long
    p = Pictos()
    ReDim t(1 To UBound(p) + 1)
    For i = 0 To UBound(p): t(i + 1) = p(i): Next i
    Pictos1 = t
End Function

Private Function ValeurHorsListeGroupe(ByVal c As Long) As String
    If c = 10 Then
        ValeurHorsListeGroupe = "Picto : valeur absente de la liste des pictos (choisir dans le menu déroulant)"
    Else
        ValeurHorsListeGroupe = NomColonne(c) & " : valeur hors de la liste (" & Join(ListeColonne(c), ", ") & "), majuscules comprises"
    End If
End Function

' Colonne E (niveau principal) : peut rester vide pour ces titres (commentaire E1 du modèle)
Private Function TitreSansNiveau(ByVal titre As String) As Boolean
    Select Case LCase$(titre)
        Case "l'intégrale du guide pédagogique", "l'intégrale du livre du professeur", "livre du professeur"
            TitreSansNiveau = True
    End Select
End Function

Private Function ContientEspace(ByVal s As String) As Boolean
    Dim i As Long
    For i = 1 To Len(s)
        If EstEspace(CodeCar(Mid$(s, i, 1))) Then ContientEspace = True: Exit Function
    Next i
End Function

Private Function EstLargeurHauteur(ByVal s As String) As Boolean
    Dim p As Long, a As String, b As String
    p = InStr(s, "/")
    If p < 2 Then Exit Function
    a = Left$(s, p - 1): b = Mid$(s, p + 1)
    If b = "" Then Exit Function
    If a Like "*[!0-9]*" Or b Like "*[!0-9]*" Then Exit Function
    EstLargeurHauteur = True
End Function

' Mémorise les numéros de ligne par clé (doublons) : « 3,8 »
Private Sub AjouterLigneCle(col As Collection, ByVal cle As String, ByVal r As Long)
    Dim ancien As String
    On Error Resume Next
    ancien = col(cle)
    If Err.Number = 0 Then
        col.Remove cle
        On Error GoTo 0
        col.Add ancien & "," & r, cle
    Else
        Err.Clear
        On Error GoTo 0
        col.Add CStr(r), cle
    End If
End Sub

' Règles communes aux noms de fichiers (colonnes A, M, N, O, T)
Private Sub ControlerNomFichier(ByVal r As Long, ByVal c As Long, ByVal f As String)
    Dim hors As Collection, ch As Variant, txt As String, abime As Boolean, msg As String
    Set hors = CaracteresHors(f, 127)
    If hors.Count > 0 Then
        For Each ch In hors
            If txt <> "" Then txt = txt & ", "
            If CodeCar(ch) > 255 Or EstEspace(CodeCar(ch)) Then
                txt = txt & "« " & ch & " » (" & CodeUnicode(ch)
                If NomCaractere(ch) <> "" Then txt = txt & ", " & NomCaractere(ch)
                txt = txt & ")"
                abime = abime Or CodeCar(ch) > 255
            Else
                txt = txt & "« " & ch & " »"
            End If
        Next ch
        msg = NomColonne(c) & " : accents et caractères spéciaux interdits dans un nom de fichier (ici " & txt & ")."
        If abime Then msg = msg & " Ce nom a probablement été abîmé : une lettre accentuée perdue lors d'une copie entre Mac et Windows ou d'une compression .zip."
        msg = msg & " Renommez le fichier dans le dossier ET dans le tableau, par exemple « " & NomFichierSur(f) & " »."
        Ajouter r, c, "err", msg, "accent", "Accents ou caractères spéciaux interdits dans un nom de fichier (é, ç, °, œ…)"
    End If
    If ContientEspace(f) Then
        Ajouter r, c, "err", NomColonne(c) & " : « " & f & " » contient un espace, interdit dans un nom de fichier. Renommez le fichier dans le dossier ET dans le tableau, par exemple « " & NomFichierSur(f) & " ».", _
            "space", "Contient un espace, interdit dans un nom de fichier"
    End If
    If InStr(f, "/") > 0 Or InStr(f, "\") > 0 Then
        Ajouter r, c, "err", NomColonne(c) & " : uniquement le nom du fichier, sans dossier (« / » ou « \ ») : les fichiers sont à la racine de l'archive.", _
            "format", "Nom de fichier avec un dossier (« / » ou « \ ») : les fichiers doivent être à la racine de l'archive"
    End If
    If InStr(f, ChrW(164)) > 0 Or InStr(f, vbTab) > 0 Or InStr(f, vbLf) > 0 Or InStr(f, vbCr) > 0 Then
        Ajouter r, c, "err", NomColonne(c) & " : le nom contient un caractère interdit (¤, tabulation ou retour à la ligne).", _
            "format", "Nom de fichier avec un caractère interdit (¤, tabulation ou retour à la ligne)"
    End If
End Sub

Private Sub ControlerDansDossier(ByVal r As Long, ByVal c As Long, ByVal f As String, noms As Collection, liste() As String, ByVal n As Long)
    Dim exact As String, sugg As String, msg As String
    On Error Resume Next
    exact = noms(LCase$(f))
    On Error GoTo 0
    If exact = f Then Exit Sub
    msg = NomColonne(c) & " : « " & f & " » est introuvable dans le dossier choisi (l'import refuserait la ligne : fichier non présent dans l'archive)."
    If exact <> "" Then
        msg = msg & " Différence de majuscules / minuscules : vouliez-vous dire « " & exact & " » ?"
    Else
        sugg = PlusProche(f, liste, n)
        If sugg <> "" Then msg = msg & " Vouliez-vous dire « " & sugg & " » ?"
    End If
    Ajouter r, c, "err", msg, "missing", "Fichier introuvable dans le dossier choisi (l'import refuserait la ligne : fichier non présent dans l'archive)"
End Sub

' ---------------------------------------------------------------------------------------------
' Dossier lu (feuille masquée « _dossier ») : A1 = chemin, B1 = date, A2… = noms des fichiers
' ---------------------------------------------------------------------------------------------
Public Function FeuilleDossier(Optional ByVal creer As Boolean = False) As Worksheet
    On Error Resume Next
    Set FeuilleDossier = ThisWorkbook.Worksheets("_dossier")
    On Error GoTo 0
    If FeuilleDossier Is Nothing And creer Then
        Set FeuilleDossier = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        FeuilleDossier.Name = "_dossier"
        FeuilleDossier.Visible = xlSheetVeryHidden
    End If
End Function

' Noms du dossier lu : collection (clé = nom en minuscules, valeur = nom exact) + tableau 1..n
Public Function NomsDuDossier(liste() As String, ByRef n As Long) As Collection
    Dim res As New Collection, ws As Worksheet, derniere As Long, r As Long, nom As String
    n = 0
    ReDim liste(1 To 1)
    Set ws = FeuilleDossier(False)
    If Not ws Is Nothing Then
        derniere = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
        If derniere >= 2 Then
            ReDim liste(1 To derniere - 1)
            For r = 2 To derniere
                nom = CStr(ws.Cells(r, 1).Value)
                If nom <> "" Then
                    n = n + 1: liste(n) = nom
                    On Error Resume Next
                    res.Add nom, LCase$(nom)
                    On Error GoTo 0
                End If
            Next r
        End If
    End If
    Set NomsDuDossier = res
End Function
