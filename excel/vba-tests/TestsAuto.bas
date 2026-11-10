Attribute VB_Name = "TestsAuto"
' Tests automatiques des règles (exécutés dans LibreOffice par tests/test_xlsm.py).
' Ce module n'est PAS inclus dans le classeur livré.
Option Explicit

Private rapport As String, nOk As Long, nKo As Long, etape As String

Private Sub Verif(ByVal condition As Boolean, ByVal libelle As String)
    If condition Then
        nOk = nOk + 1
    Else
        nKo = nKo + 1
        rapport = rapport & "ECHEC : " & libelle & vbLf
    End If
End Sub

Private Function ErreurExec() As String
    ErreurExec = nOk & " ok, " & (nKo + 1) & " echec(s)" & vbLf & rapport & "ECHEC : erreur d'exécution " & Err.Number & " (" & Err.Description & ") à l'étape « " & etape & " », dernière ligne : " & TraceLigne & vbLf
    nOk = 0: nKo = 0: rapport = ""
End Function

Private Function Fin() As String
    Fin = nOk & " ok, " & nKo & " echec(s)" & vbLf & rapport
    nOk = 0: nKo = 0: rapport = ""
End Function

' Ligne complète valide, modifiée par « col=valeur|col=valeur »
Private Sub EcrireLigne(ws As Worksheet, ByVal r As Long, ByVal modifs As String)
    Dim v As Variant, i As Long, m As Variant, p As Long
    v = Array("f.pdf", "Titre", "", "", "Niveau 1", "", "", "Cat", "", "image", "ELE", "1", "", "", "", "FR", "0", "0", "", "", "", "", "")
    If modifs <> "" Then
        For Each m In Split(modifs, "|")
            p = InStr(m, "=")
            v(CLng(Left$(m, p - 1)) - 1) = Mid$(m, p + 1)
        Next m
    End If
    For i = 0 To 22
        ws.Cells(r, i + 1).Value = v(i)
    Next i
End Sub

Private Function A(ByVal ligne As Long, ByVal col As Long, ByVal typ As String, ByVal motif As String) As Boolean
    Dim i As Long
    For i = 1 To nbIss
        If issLigne(i) = ligne And issCol(i) = col And (typ = "" Or issType(i) = typ) Then
            If motif = "" Or InStr(1, issMsg(i), motif, vbBinaryCompare) > 0 Then A = True: Exit Function
        End If
    Next i
End Function

Private Function NbIssLigne(ByVal ligne As Long, ByVal niveau As String) As Long
    Dim i As Long
    For i = 1 To nbIss
        If issLigne(i) = ligne And (niveau = "" Or issNiveau(i) = niveau) Then NbIssLigne = NbIssLigne + 1
    Next i
End Function

Public Function TestTexte() As String
    Call Verif(NormTexte("  L" & ChrW(8217) & ChrW(339) & "uvre  " & ChrW(8220) & "complète" & ChrW(8221) & " " & ChrW(8211) & " 10 " & ChrW(8364) & ChrW(8230) & "  ") = "L'oeuvre «complète» - 10 EUR...", "NormTexte : apostrophe, guillemets, tiret, œ, €, …, espaces")
    Call Verif(NormTexte("a" & ChrW(164) & "b" & vbTab & "c" & vbLf & "d") = "ab c d", "NormTexte : ¤ supprimé, tabulation / retour à la ligne")
    Call Verif(NormTexte(ChrW(338) & "il " & ChrW(8212) & " " & ChrW(8216) & "x" & ChrW(8217)) = "OEil - 'x'", "NormTexte : Œ — ‘ ’")
    Call Verif(NormFichier("  Fiche_n1.pdf ") = "Fiche_n1.pdf", "NormFichier : trim seulement")
    Call Verif(NomFichierSur("09506161 Phonology A1.mp3") = "09506161_Phonology_A1.mp3", "NomFichierSur : espaces")
    Call Verif(NomFichierSur("Qu-y-a-t-il-dans-ta-tête.mp4") = "Qu-y-a-t-il-dans-ta-tete.mp4", "NomFichierSur : accent")
    Call Verif(NomFichierSur("n°1_" & ChrW(339) & "uvre.pdf") = "n1_oeuvre.pdf", "NomFichierSur : ° et œ")
    Call Verif(CompareNaturel("doc2.pdf", "doc10.pdf") < 0, "tri naturel doc2 < doc10")
    Call Verif(CompareNaturel("Doc10.pdf", "doc9.pdf") > 0, "tri naturel doc10 > doc9")
    Call Verif(CompareNaturel("a.pdf", "a.pdf") = 0, "tri naturel égalité")
    Call Verif(Extension("x.PDF") = "pdf" And Extension("sansextension") = "" And Extension("a.") = "", "Extension")
    Call Verif(Levenshtein("doc01.pdf", "doc1.pdf", 5) = 1, "Levenshtein")
    Dim t(1 To 3) As String
    t(1) = "doc10.pdf": t(2) = "doc2.pdf": t(3) = "doc1.pdf"
    Call Verif(PlusProche("doc01.pdf", t, 3) = "doc1.pdf", "PlusProche")
    TrierNaturel t, 3
    Call Verif(t(1) = "doc1.pdf" And t(2) = "doc2.pdf" And t(3) = "doc10.pdf", "TrierNaturel")
    Dim lignes As Collection, sep As String
    Set lignes = LireCsv("a;""b ; c"";""d """"e""""""" & vbCrLf & "1;2;3" & vbCrLf, sep)
    Call Verif(sep = "point-virgule" And lignes.Count = 2, "LireCsv : point-virgule, 2 lignes")
    Call Verif(lignes(1)(2) = "b ; c" And lignes(1)(3) = "d ""e""", "LireCsv : guillemets")
    Set lignes = LireCsv("x" & ChrW(164) & "y" & ChrW(164) & vbCrLf & "z", sep)
    Call Verif(sep = "¤" And lignes(1).Count = 3 And lignes(2)(1) = "z", "LireCsv : ¤")
    TestTexte = Fin()
End Function

Public Function TestControle() As String
    On Error GoTo Erreur
    etape = "début"
    Dim ws As Worksheet, r As Long
    etape = "Set ws = FeuilleTravail()"
    Set ws = FeuilleTravail()
    etape = "ws.Range('A2:W2000').ClearContents"
    ws.Range("A2:W2000").ClearContents
    etape = "EcrireLigne ws, 2, ''                                                 "
    EcrireLigne ws, 2, ""                                                    ' valide (doublon avec ligne 4)
    etape = "EcrireLigne ws, 3, '1=g.pdf|10=imgae|11=eleve|16=fr|21=Extrait'       "
    EcrireLigne ws, 3, "1=g.pdf|10=imgae|11=eleve|16=fr|21=Extrait"            ' hors liste
    etape = "EcrireLigne ws, 4, '1=F.PDF'                                          "
    EcrireLigne ws, 4, "1=F.PDF"                                              ' doublon (majuscules)
    etape = "EcrireLigne ws, 5, '1=h.pdf|2=Titre'                                  "
    EcrireLigne ws, 5, "1=h.pdf|2=Titre"                                      ' titre en double
    etape = "EcrireLigne ws, 6, '1=sansextension'"
    EcrireLigne ws, 6, "1=sansextension"
    etape = "EcrireLigne ws, 7, '1=http://exemple.fr/x'"
    EcrireLigne ws, 7, "1=http://exemple.fr/x"
    etape = "EcrireLigne ws, 8, '1=https://exemple.fr/ressource|2=Lien'"
    EcrireLigne ws, 8, "1=https://exemple.fr/ressource|2=Lien"
    etape = "EcrireLigne ws, 9, '1=i.pdf|2=Titre ' & ChrW(10003) & ' coché'"
    EcrireLigne ws, 9, "1=i.pdf|2=Titre " & ChrW(10003) & " coché"
    etape = "EcrireLigne ws, 10, '1=j.pdf|2=L' & ChrW(8217) & 'intégrale du livre d"
    EcrireLigne ws, 10, "1=j.pdf|2=L" & ChrW(8217) & "intégrale du livre du professeur|5="
    etape = "EcrireLigne ws, 11, '1=k.pdf|2=Autre|5='"
    EcrireLigne ws, 11, "1=k.pdf|2=Autre|5="
    etape = "EcrireLigne ws, 12, '1=l.pdf|2=L2|13=audio.wav|22=800x600'"
    EcrireLigne ws, 12, "1=l.pdf|2=L2|13=audio.wav|22=800x600"
    etape = "EcrireLigne ws, 13, '1=m.pdf|2=M|12=O|4=2'"
    EcrireLigne ws, 13, "1=m.pdf|2=M|12=O|4=2"
    etape = "EcrireLigne ws, 14, '1=dossier/n.pdf|2=N'"
    EcrireLigne ws, 14, "1=dossier/n.pdf|2=N"
    etape = "EcrireLigne ws, 15, '1=o.pdf|2=O|10=Image'"
    EcrireLigne ws, 15, "1=o.pdf|2=O|10=Image"
    etape = "EcrireLigne ws, 16, '1=mon fichier.pdf|2=P|14=sous titre.vtt'"
    EcrireLigne ws, 16, "1=mon fichier.pdf|2=P|14=sous titre.vtt"
    etape = "EcrireLigne ws, 17, '1=Qu-y-a-t-il-dans-ta-tête.mp4|2=Q|20=miniaé.jpg'"
    EcrireLigne ws, 17, "1=Qu-y-a-t-il-dans-ta-tête.mp4|2=Q|20=miniaé.jpg"
    etape = "EcrireLigne ws, 18, '1=te' & ChrW(65533) & 'te.mp4|2=R'"
    EcrireLigne ws, 18, "1=te" & ChrW(65533) & "te.mp4|2=R"
    etape = "EcrireLigne ws, 19, '1=|2=|5=|8=|10=|11=|12=|16=|17=|18=|3=texte seul'"
    EcrireLigne ws, 19, "1=|2=|5=|8=|10=|11=|12=|16=|17=|18=|3=texte seul"
    etape = "EcrireLigne ws, 20, '1=ok.pdf|2=S|9=Texte ' & ChrW(65533) & ' abîmé'"
    EcrireLigne ws, 20, "1=ok.pdf|2=S|9=Texte " & ChrW(65533) & " abîmé"
    etape = "EcrireLigne ws, 21, '1=p.pdf|2=T|22=800/600'"
    EcrireLigne ws, 21, "1=p.pdf|2=T|22=800/600"
    etape = "Controler ws"
    Controler ws

    Call Verif(NbIssLigne(2, "err") = 0 And NbIssLigne(2, "dup") = 1, "ligne valide : seulement le doublon")
    Call Verif(A(3, 10, "list", "Vouliez-vous dire « image »"), "picto hors liste + suggestion")
    Call Verif(A(3, 11, "list", "") And A(3, 16, "list", "« FR »") And A(3, 21, "list", "« extrait »"), "profil / langue / watermark")
    Call Verif(A(2, 1, "dup", "") And A(4, 1, "dup", ""), "doublon de nom de fichier (majuscules comprises)")
    Call Verif(A(2, 2, "duptitle", "") And A(5, 2, "duptitle", ""), "titre en double = avertissement")
    Call Verif(A(6, 1, "format", "extension"), "extension manquante")
    Call Verif(A(7, 1, "format", "https"), "http refusé")
    Call Verif(NbIssLigne(8, "") = 0, "https accepté")
    Call Verif(A(9, 2, "latin1", "U+2713"), "caractère hors Latin-1")
    Call Verif(Not A(10, 5, "req", ""), "colonne E non exigée pour l'intégrale (apostrophe typographique)")
    Call Verif(A(11, 5, "req", ""), "colonne E exigée sinon")
    Call Verif(A(12, 13, "ext", ".mp3") And A(12, 22, "format", "800/600"), "extension compagnon et iFrame = avertissements")
    Call Verif(A(13, 12, "list", "lettre O") And A(13, 4, "list", ""), "0/1 : O et 2 refusés")
    Call Verif(A(14, 1, "format", "racine"), "chemin refusé")
    Call Verif(A(15, 10, "list", "exactement « image »"), "majuscules du picto")
    Call Verif(A(16, 1, "space", "mon_fichier.pdf") And A(16, 14, "space", ""), "espace interdit + proposition")
    Call Verif(A(17, 1, "accent", "Qu-y-a-t-il-dans-ta-tete.mp4") And A(17, 20, "accent", ""), "accent interdit + proposition")
    Call Verif(A(18, 1, "accent", "abîmé"), "nom abîmé (caractère illisible)")
    Call Verif(A(19, 1, "req", "") And A(19, 2, "req", "") And A(19, 10, "req", ""), "colonnes obligatoires vides")
    Call Verif(A(20, 9, "latin1", "Retapez le mot"), "caractère illisible dans un texte")
    Call Verif(NbIssLigne(21, "") = 0, "iFrame 800/600 accepté")
    Call Verif(nbRessources = 20, "20 ressources comptées (" & nbRessources & ")")
    Call Verif(nbErreurs > 0 And nbAvertissements > 0, "totaux")
    Call Verif(TexteRapport() Like "* erreurs bloquantes sur * lignes : import.csv ne peut pas encore être exporté*", "titre du rapport")
    Call Verif(InStr(TexteRapport(), "erreurs · Colonne obligatoire vide : ") > 0 Or InStr(TexteRapport(), "erreur · Colonne obligatoire vide : ") > 0, "groupe « Colonne obligatoire vide »")
    Call Verif(InStr(TexteRapport(), "L19 (Nom du fichier, Titre, Niveau principal, Catégorie, Picto, Profil, Téléchargement, Langue, Intégrale prof., Méthode)") > 0, "colonnes manquantes par ligne")
    Call Verif(InStr(TexteRapport(), "2 erreurs · Nom du fichier en double : interdit, chaque fichier ne doit apparaître qu'une fois : L2, L4") > 0, "groupe doublons L2, L4")
    TestControle = Fin() & vbLf & "--- Rapport ---" & vbLf & TexteRapport()
    Exit Function
Erreur:
    TestControle = ErreurExec()
End Function

' Dossier : noms exacts, majuscules, suggestion, fichiers compagnons
Public Function TestDossier() As String
    On Error GoTo Erreur
    etape = "début"
    Dim ws As Worksheet, wd As Worksheet
    etape = "Set ws = FeuilleTravail()"
    Set ws = FeuilleTravail()
    etape = "ws.Range('A2:W2000').ClearContents"
    ws.Range("A2:W2000").ClearContents
    etape = "Set wd = FeuilleDossier(True)"
    Set wd = FeuilleDossier(True)
    etape = "wd.Cells.Clear"
    wd.Cells.Clear
    etape = "wd.Range('A1').Value = 'C:\Lot'"
    wd.Range("A1").Value = "C:\Lot"
    etape = "wd.Range('A2').Value = 'doc1.pdf': wd.Range('A3').Value = 'doc2.pdf': "
    wd.Range("A2").Value = "doc1.pdf": wd.Range("A3").Value = "doc2.pdf": wd.Range("A4").Value = "audio_ch1.mp3"
    etape = "EcrireLigne ws, 2, '1=doc1.pdf|2=A'"
    EcrireLigne ws, 2, "1=doc1.pdf|2=A"
    etape = "EcrireLigne ws, 3, '1=doc01.pdf|2=B'"
    EcrireLigne ws, 3, "1=doc01.pdf|2=B"
    etape = "EcrireLigne ws, 4, '1=DOC2.PDF|2=C'"
    EcrireLigne ws, 4, "1=DOC2.PDF|2=C"
    etape = "EcrireLigne ws, 5, '1=doc2.pdf|2=D|13=audio_ch1.mp3|14=absent.vtt'"
    EcrireLigne ws, 5, "1=doc2.pdf|2=D|13=audio_ch1.mp3|14=absent.vtt"
    etape = "Controler ws"
    Controler ws
    Call Verif(NbIssLigne(2, "") = 0, "nom présent")
    Call Verif(A(3, 1, "missing", "Vouliez-vous dire « doc1.pdf »"), "nom absent + suggestion")
    Call Verif(A(4, 1, "missing", "majuscules"), "différence de majuscules")
    Call Verif(A(5, 14, "missing", "") And Not A(5, 13, "missing", ""), "fichiers compagnons")
    etape = "wd.Cells.Clear"
    wd.Cells.Clear
    TestDossier = Fin()
    Exit Function
Erreur:
    TestDossier = ErreurExec()
End Function

' Aller-retour : l'exemple import.csv relu puis réécrit redonne les mêmes octets
Public Function TestCsv(ByVal chemin As String) As String
    On Error GoTo Erreur
    etape = "début"
    Dim n As Integer, octets() As Byte, taille As Long, texte As String, lignes As Collection, sep As String
    Dim ws As Worksheet, r As Long, c As Long, sortie() As Byte, i As Long, identique As Boolean
    etape = "n = FreeFile"
    n = FreeFile
    etape = "Open chemin For Binary Access Read As #n"
    Open chemin For Binary Access Read As #n
    etape = "taille = LOF(n)"
    taille = LOF(n)
    ReDim octets(0 To taille - 1)
    etape = "Get #n, , octets"
    Get #n, , octets
    etape = "Close #n"
    Close #n
    etape = "texte = DecoderWindows1252(octets)"
    texte = DecoderWindows1252(octets)
    etape = "Set lignes = LireCsv(texte, sep)"
    Set lignes = LireCsv(texte, sep)
    etape = "Set ws = FeuilleTravail()"
    Set ws = FeuilleTravail()
    etape = "ws.Range('A2:W2000').ClearContents"
    ws.Range("A2:W2000").ClearContents
    Dim notes As String
    EcrireLignes ws, PreparerLignes(lignes, notes)
    Call Verif(notes = "", "aucune remarque à l'import de l'exemple (" & notes & ")")
    Call Verif(Controler(ws) = 0, "l'exemple ne contient aucune erreur bloquante")
    Call Verif(nbRessources = 5, "5 ressources (" & nbRessources & ")")
    etape = "sortie = OctetsLatin1(TexteCsv(ws))"
    sortie = OctetsLatin1(TexteCsv(ws))
    etape = "identique = (UBound(sortie) = UBound(octets))"
    identique = (UBound(sortie) = UBound(octets))
    If identique Then
        For i = 0 To UBound(octets)
            If sortie(i) <> octets(i) Then identique = False: Exit For
        Next i
    End If
    Call Verif(identique, "octets identiques à l'exemple (" & (UBound(sortie) + 1) & " / " & (UBound(octets) + 1) & ")")
    TestCsv = Fin()
    Exit Function
Erreur:
    TestCsv = ErreurExec()
End Function

' Enchaîne Vérifier (couleurs, notes, feuille Contrôle) sur les données de TestControle
Public Function TestVerifier() As String
    On Error GoTo Erreur
    etape = "début"
    Dim ws As Worksheet
    TestControle
    etape = "Set ws = FeuilleTravail()"
    Set ws = FeuilleTravail()
    etape = "Verifier False"
    Verifier False
    Call Verif(ws.Range("A16").Interior.Color = COULEUR_ERREUR, "cellule A16 en rouge")
    Call Verif(ws.Range("A4").Interior.Color = COULEUR_DOUBLON, "doublon A4 en orange")
    Call Verif(ws.Range("B5").Interior.Color = COULEUR_AVERT, "titre en double B5 en jaune")
    Call Verif(Not ws.Range("A16").Comment Is Nothing, "note sur A16")
    Call Verif(ThisWorkbook.Worksheets("Contrôle").Range("A6").Value Like "* erreurs bloquantes sur *", "feuille Contrôle : titre")
    TestVerifier = Fin()
    Exit Function
Erreur:
    TestVerifier = ErreurExec()
End Function

' Import d'un CSV point-virgule : en-tête, guillemets, ligne vide, uuid, formule, 0/1 en nombre
Public Function TestImport() As String
    On Error GoTo Erreur
    Dim ws As Worksheet, lignes As Collection, sep As String, notes As String, txt As String, prep As Collection
    Set ws = FeuilleTravail()
    txt = "Nom du fichier (extension comprise);Titre de la ressource;c3;c4;c5;c6;c7;c8;c9;c10;c11;c12;c13;c14;c15;c16;c17;c18;c19;c20;c21;c22;uuid" & vbCrLf & _
        "fiche1.pdf;""Fiche « un » ; avec point-virgule"";;;Chapitre 1;;;Exercices;;texte;ELE;1;;;;FR;0;0;01;;;;1234-uuid" & vbCrLf & _
        vbCrLf & _
        "fiche2.pdf;=SOMME(1);;;Chapitre 1;;;Exercices;;texte;ELE;1;;;;FR;0;0;;;;;" & vbCrLf
    Set lignes = LireCsv(txt, sep)
    Set prep = PreparerLignes(lignes, notes)
    Call Verif(sep = "point-virgule" And prep.Count = 2, "2 ressources, séparateur point-virgule")
    Call Verif(InStr(notes, "uuid") > 0 And InStr(notes, "ligne vide") > 0, "remarques : uuid et ligne vide (" & notes & ")")
    EcrireLignes ws, prep
    Call Verif(ws.Range("B2").Value = "Fiche « un » ; avec point-virgule", "texte avec point-virgule entre guillemets [A2=" & ws.Range("A2").Value & "|B2=" & ws.Range("B2").Value & "|A3=" & ws.Range("A3").Value & "|L2=" & ws.Range("L2").Value & "|S2=" & ws.Range("S2").Value & "|E2=" & ws.Range("E2").Value & "]")
    Call Verif(ws.Range("B3").Value = "=SOMME(1)" And Not ws.Range("B3").HasFormula, "« =SOMME(1) » reste du texte (pas une formule)")
    Call Verif(VarType(ws.Range("L2").Value) <> vbString And ws.Range("L2").Value = 1, "colonne Téléchargement : nombre 1")
    Call Verif(CStr(ws.Range("S2").Value) = "01", "n° de page « 01 » conservé")
    Call Verif(ws.Range("W2").Value = "", "uuid vide")
    Call Verif(Controler(ws) = 0, "aucune erreur bloquante")
    Dim t As String
    t = TexteCsv(ws)
    Call Verif(InStr(t, "fiche2.pdf" & ChrW(164) & "=SOMME(1)" & ChrW(164)) > 0, "export : texte « =SOMME(1) » inchangé")
    Call Verif(InStr(t, ChrW(164) & "01" & ChrW(164)) > 0, "export : n° de page 01")
    ' Fichiers du dossier absents du tableau
    Dim noms(1 To 3) As String, abs As Variant, nAbs As Long
    noms(1) = "fiche1.pdf": noms(2) = "fiche3.pdf": noms(3) = "fiche4.pdf"
    abs = FichiersAbsentsPublic(ws, noms, 3, nAbs)
    Call Verif(nAbs = 2 And abs(1) = "fiche3.pdf" And abs(2) = "fiche4.pdf", "fichiers du dossier absents du tableau")
    TestImport = Fin()
    Exit Function
Erreur:
    TestImport = ErreurExec()
End Function
