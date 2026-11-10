Attribute VB_Name = "Outils"
' Outils de texte : normalisation avant export, tri naturel, distance entre deux noms,
' lecture d'un fichier CSV.
Option Explicit

' Espace au sens large (espace, tabulation, retour à la ligne, espaces insécables…)
Public Function EstEspace(ByVal code As Long) As Boolean
    Select Case code
        Case 9 To 13, 32, 160, 5760, 8192 To 8202, 8232, 8233, 8239, 8287, 12288, 65279
            EstEspace = True
    End Select
End Function

Public Function CodeCar(ByVal ch As String) As Long
    CodeCar = AscW(ch)
    If CodeCar < 0 Then CodeCar = CodeCar + 65536
End Function

' Supprime les espaces (au sens large) au début et à la fin
Public Function TrimTout(ByVal s As String) As String
    Dim a As Long, b As Long
    a = 1: b = Len(s)
    Do While a <= b
        If Not EstEspace(CodeCar(Mid$(s, a, 1))) Then Exit Do
        a = a + 1
    Loop
    Do While b >= a
        If Not EstEspace(CodeCar(Mid$(s, b, 1))) Then Exit Do
        b = b - 1
    Loop
    If b >= a Then TrimTout = Mid$(s, a, b - a + 1) Else TrimTout = ""
End Function

' Colonnes de noms de fichiers : forme Unicode composée + suppression des espaces de début et de fin
Public Function NormFichier(ByVal s As String) As String
    NormFichier = TrimTout(NFC(s))
End Function

' Autres colonnes : normalisation avant export (apostrophes, guillemets, tirets, œ, €, ¤, espaces)
Public Function NormTexte(ByVal s As String) As String
    Dim r As String, i As Long, ch As String, code As Long, dansEspace As Boolean
    s = NFC(s)
    r = ""
    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        code = CodeCar(ch)
        If EstEspace(code) Then
            If Not dansEspace Then r = r & " "
            dansEspace = True
        Else
            dansEspace = False
            Select Case code
                Case 8217, 8216: r = r & "'"
                Case 8220: r = r & ChrW(171)
                Case 8221: r = r & ChrW(187)
                Case 8211, 8212: r = r & "-"
                Case 8230: r = r & "..."
                Case 339: r = r & "oe"
                Case 338: r = r & "OE"
                Case 8364: r = r & "EUR"
                Case 164: ' ¤ supprimé
                Case Else: r = r & ch
            End Select
        End If
    Next i
    NormTexte = TrimTout(r)
End Function

' Proposition de nom de fichier sûr : sans accent ni caractère spécial, espaces remplacés par « _ »
Public Function NomFichierSur(ByVal f As String) As String
    Dim r As String, i As Long, ch As String, code As Long
    Dim avec As String, sans As String, p As Long
    avec = "ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝýÿ"
    sans = "AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYyy"
    r = ""
    Dim dansEspace As Boolean
    For i = 1 To Len(f)
        ch = Mid$(f, i, 1)
        code = CodeCar(ch)
        If EstEspace(code) Then
            If Not dansEspace Then r = r & "_"
            dansEspace = True
        Else
            dansEspace = False
            p = InStr(1, avec, ch, vbBinaryCompare)
            If p > 0 Then
                r = r & Mid$(sans, p, 1)
            ElseIf code = 339 Then
                r = r & "oe"
            ElseIf code = 338 Then
                r = r & "OE"
            ElseIf code = 230 Then
                r = r & "ae"
            ElseIf code = 198 Then
                r = r & "AE"
            ElseIf code = 223 Then
                r = r & "ss"
            ElseIf code >= 32 And code <= 126 Then
                r = r & ch
            End If
        End If
    Next i
    NomFichierSur = r
End Function

' Liste « « x » (U+XXXX) » des caractères au-dessus de 127 (ou 255), sans doublon
Public Function CaracteresHors(ByVal s As String, ByVal limite As Long) As Collection
    Dim res As New Collection, i As Long, ch As String, deja As String
    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        If CodeCar(ch) > limite Then
            If InStr(1, deja, ch, vbBinaryCompare) = 0 Then
                deja = deja & ch
                res.Add ch
            End If
        End If
    Next i
    Set CaracteresHors = res
End Function

Public Function CodeUnicode(ByVal ch As String) As String
    CodeUnicode = "U+" & Right$("0000" & Hex$(CodeCar(ch)), 4)
End Function

Public Function NomCaractere(ByVal ch As String) As String
    Select Case CodeCar(ch)
        Case 65533: NomCaractere = "caractère illisible"
        Case 11822: NomCaractere = "point d'interrogation inversé"
        Case 1567: NomCaractere = "point d'interrogation arabe"
        Case 8226: NomCaractere = "puce"
        Case 8594: NomCaractere = "flèche"
        Case 10003: NomCaractere = "coche"
        Case 8482: NomCaractere = "marque déposée TM"
        Case 8804: NomCaractere = "inférieur ou égal"
        Case 8805: NomCaractere = "supérieur ou égal"
        Case 8800: NomCaractere = "différent"
        Case 768 To 879: NomCaractere = "accent séparé de sa lettre"
    End Select
End Function

' Extension en minuscules (« pdf »), vide s'il n'y en a pas
Public Function Extension(ByVal nom As String) As String
    Dim p As Long, e As String, i As Long
    p = InStrRev(nom, ".")
    If p = 0 Or p = Len(nom) Then Exit Function
    e = Mid$(nom, p + 1)
    For i = 1 To Len(e)
        If Not (Mid$(e, i, 1) Like "[A-Za-z0-9]") Then Exit Function
    Next i
    Extension = LCase$(e)
End Function

' Distance d'édition (nombre de lettres à changer), arrêt au-delà de maxi
Public Function Levenshtein(ByVal a As String, ByVal b As String, ByVal maxi As Long) As Long
    Dim la As Long, lb As Long, i As Long, j As Long, cout As Long, meilleur As Long
    la = Len(a): lb = Len(b)
    If a = b Then Levenshtein = 0: Exit Function
    If Abs(la - lb) > maxi Then Levenshtein = maxi + 1: Exit Function
    Dim prec() As Long, cour() As Long
    ReDim prec(0 To lb): ReDim cour(0 To lb)
    For j = 0 To lb: prec(j) = j: Next j
    For i = 1 To la
        cour(0) = i: meilleur = i
        For j = 1 To lb
            If Mid$(a, i, 1) = Mid$(b, j, 1) Then cout = 0 Else cout = 1
            cour(j) = prec(j) + 1
            If cour(j - 1) + 1 < cour(j) Then cour(j) = cour(j - 1) + 1
            If prec(j - 1) + cout < cour(j) Then cour(j) = prec(j - 1) + cout
            If cour(j) < meilleur Then meilleur = cour(j)
        Next j
        If meilleur > maxi Then Levenshtein = maxi + 1: Exit Function
        For j = 0 To lb: prec(j) = cour(j): Next j
    Next i
    Levenshtein = prec(lb)
End Function

' Nom le plus proche dans une liste (« Vouliez-vous dire … ? »), vide si aucun n'est assez proche
Public Function PlusProche(ByVal nom As String, liste As Variant, ByVal n As Long) As String
    Dim i As Long, d As Long, meilleurD As Long, maxi As Long, bas As String
    bas = LCase$(nom)
    maxi = Len(nom) * 3 \ 10
    If maxi < 2 Then maxi = 2
    meilleurD = maxi + 1
    For i = 1 To n
        If LCase$(liste(i)) = bas Then PlusProche = liste(i): Exit Function
        d = Levenshtein(bas, LCase$(liste(i)), meilleurD - 1)
        If d < meilleurD Then meilleurD = d: PlusProche = liste(i)
    Next i
    If meilleurD > maxi Then PlusProche = ""
End Function

' Comparaison « naturelle » : doc2 avant doc10, sans tenir compte des majuscules
Public Function CompareNaturel(ByVal a As String, ByVal b As String) As Long
    Dim i As Long, j As Long, ca As String, cb As String, na As String, nb As String
    a = LCase$(a): b = LCase$(b)
    i = 1: j = 1
    Do While i <= Len(a) And j <= Len(b)
        ca = Mid$(a, i, 1): cb = Mid$(b, j, 1)
        If ca Like "#" And cb Like "#" Then
            na = "": nb = ""
            Do While i <= Len(a)
                If Not (Mid$(a, i, 1) Like "#") Then Exit Do
                na = na & Mid$(a, i, 1): i = i + 1
            Loop
            Do While j <= Len(b)
                If Not (Mid$(b, j, 1) Like "#") Then Exit Do
                nb = nb & Mid$(b, j, 1): j = j + 1
            Loop
            na = SansZeros(na): nb = SansZeros(nb)
            If Len(na) <> Len(nb) Then CompareNaturel = Sgn(Len(na) - Len(nb)): Exit Function
            If na <> nb Then CompareNaturel = StrComp(na, nb, vbBinaryCompare): Exit Function
        Else
            If ca <> cb Then CompareNaturel = StrComp(ca, cb, vbTextCompare): If CompareNaturel <> 0 Then Exit Function
            i = i + 1: j = j + 1
        End If
    Loop
    CompareNaturel = Sgn((Len(a) - i) - (Len(b) - j))
End Function

Private Function SansZeros(ByVal s As String) As String
    Do While Len(s) > 1 And Left$(s, 1) = "0"
        s = Mid$(s, 2)
    Loop
    SansZeros = s
End Function

' Tri naturel d'un tableau de noms (indices 1 à n)
Public Sub TrierNaturel(t() As String, ByVal n As Long)
    Dim i As Long, j As Long, v As String
    ' tri par insertion : quelques centaines de noms au plus
    For i = 2 To n
        v = t(i): j = i - 1
        Do While j >= 1
            If CompareNaturel(t(j), v) <= 0 Then Exit Do
            t(j + 1) = t(j): j = j - 1
        Loop
        t(j + 1) = v
    Next i
End Sub

' Lit un texte CSV : séparateur ¤ (sans guillemets) ou ; , tabulation (avec guillemets).
' Renvoie une collection de lignes, chaque ligne étant une collection de cellules.
Public Function LireCsv(ByVal texte As String, ByRef sepNom As String) As Collection
    Dim lignes As New Collection, sep As String, premiere As String, p As Long
    Dim nbTab As Long, nbPv As Long, nbV As Long
    p = InStr(texte, vbLf)
    If p > 0 Then premiere = Left$(texte, p) Else premiere = texte
    If InStr(premiere, ChrW(164)) > 0 Then
        sep = ChrW(164): sepNom = "¤"
    Else
        nbTab = UBound(Split(premiere, vbTab))
        nbPv = UBound(Split(premiere, ";"))
        nbV = UBound(Split(premiere, ","))
        If nbTab >= nbPv And nbTab >= nbV And nbTab > 0 Then
            sep = vbTab: sepNom = "tabulation"
        ElseIf nbPv >= nbV And nbPv > 0 Then
            sep = ";": sepNom = "point-virgule"
        ElseIf nbV > 0 Then
            sep = ",": sepNom = "virgule"
        Else
            sep = ChrW(164): sepNom = "¤"
        End If
    End If
    texte = Replace(texte, vbCrLf, vbLf)
    texte = Replace(texte, vbCr, vbLf)
    Dim ligne As Collection, cellule As String, i As Long, ch As String, entreGuillemets As Boolean
    If sep = ChrW(164) Then
        Dim morceaux As Variant, k As Long, c As Variant
        morceaux = Split(texte, vbLf)
        For k = LBound(morceaux) To UBound(morceaux)
            Set ligne = New Collection
            For Each c In Split(morceaux(k), sep)
                ligne.Add CStr(c)
            Next c
            lignes.Add ligne
        Next k
    Else
        Set ligne = New Collection
        cellule = ""
        For i = 1 To Len(texte)
            ch = Mid$(texte, i, 1)
            If entreGuillemets Then
                If ch = """" Then
                    If Mid$(texte, i + 1, 1) = """" Then
                        cellule = cellule & """": i = i + 1
                    Else
                        entreGuillemets = False
                    End If
                Else
                    cellule = cellule & ch
                End If
            ElseIf ch = """" And cellule = "" Then
                entreGuillemets = True
            ElseIf ch = sep Then
                ligne.Add cellule: cellule = ""
            ElseIf ch = vbLf Then
                ligne.Add cellule: cellule = ""
                lignes.Add ligne
                Set ligne = New Collection
            Else
                cellule = cellule & ch
            End If
        Next i
        If cellule <> "" Or ligne.Count > 0 Then ligne.Add cellule: lignes.Add ligne
    End If
    Set LireCsv = lignes
End Function

Public Function Pluriel(ByVal n As Long, ByVal un As String, ByVal plusieurs As String) As String
    If n > 1 Then Pluriel = n & " " & plusieurs Else Pluriel = n & " " & un
End Function

Public Function MaintenantTexte() As String
    MaintenantTexte = "le " & Format$(Now, "dd/mm/yyyy") & " à " & Format$(Now, "hh:nn")
End Function
