Attribute VB_Name = "ApiWindows"
' Fonctions Windows utilisées par le classeur : presse-papiers, normalisation Unicode,
' décodage UTF-8. Regroupées ici pour isoler les déclarations système.
Option Explicit

#If VBA7 Then
    Private Declare PtrSafe Function OpenClipboard Lib "user32" (ByVal hwnd As LongPtr) As Long
    Private Declare PtrSafe Function EmptyClipboard Lib "user32" () As Long
    Private Declare PtrSafe Function CloseClipboard Lib "user32" () As Long
    Private Declare PtrSafe Function SetClipboardData Lib "user32" (ByVal wFormat As Long, ByVal hMem As LongPtr) As LongPtr
    Private Declare PtrSafe Function GlobalAlloc Lib "kernel32" (ByVal wFlags As Long, ByVal dwBytes As LongPtr) As LongPtr
    Private Declare PtrSafe Function GlobalLock Lib "kernel32" (ByVal hMem As LongPtr) As LongPtr
    Private Declare PtrSafe Function GlobalUnlock Lib "kernel32" (ByVal hMem As LongPtr) As Long
    Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal Destination As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)
    Private Declare PtrSafe Function NormalizeString Lib "Normaliz.dll" (ByVal NormForm As Long, ByVal lpSrcString As LongPtr, ByVal cwSrcLength As Long, ByVal lpDstString As LongPtr, ByVal cwDstLength As Long) As Long
    Private Declare PtrSafe Function MultiByteToWideChar Lib "kernel32" (ByVal CodePage As Long, ByVal dwFlags As Long, ByVal lpMultiByteStr As LongPtr, ByVal cbMultiByte As Long, ByVal lpWideCharStr As LongPtr, ByVal cchWideChar As Long) As Long
#Else
    Private Declare Function OpenClipboard Lib "user32" (ByVal hwnd As Long) As Long
    Private Declare Function EmptyClipboard Lib "user32" () As Long
    Private Declare Function CloseClipboard Lib "user32" () As Long
    Private Declare Function SetClipboardData Lib "user32" (ByVal wFormat As Long, ByVal hMem As Long) As Long
    Private Declare Function GlobalAlloc Lib "kernel32" (ByVal wFlags As Long, ByVal dwBytes As Long) As Long
    Private Declare Function GlobalLock Lib "kernel32" (ByVal hMem As Long) As Long
    Private Declare Function GlobalUnlock Lib "kernel32" (ByVal hMem As Long) As Long
    Private Declare Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal Destination As Long, ByVal Source As Long, ByVal Length As Long)
    Private Declare Function NormalizeString Lib "Normaliz.dll" (ByVal NormForm As Long, ByVal lpSrcString As Long, ByVal cwSrcLength As Long, ByVal lpDstString As Long, ByVal cwDstLength As Long) As Long
    Private Declare Function MultiByteToWideChar Lib "kernel32" (ByVal CodePage As Long, ByVal dwFlags As Long, ByVal lpMultiByteStr As Long, ByVal cbMultiByte As Long, ByVal lpWideCharStr As Long, ByVal cchWideChar As Long) As Long
#End If

Private Const CF_UNICODETEXT As Long = 13
Private Const GMEM_MOVEABLE As Long = &H2
Private Const MB_ERR_INVALID_CHARS As Long = &H8

' Copie un texte dans le presse-papiers Windows. Renvoie True si la copie a réussi.
Public Function CopierDansPressePapiers(ByVal texte As String) As Boolean
    On Error GoTo Echec
    Dim nbOctets As Long, hMem As LongPtr, p As LongPtr
    nbOctets = (Len(texte) + 1) * 2
    hMem = GlobalAlloc(GMEM_MOVEABLE, nbOctets)
    If hMem = 0 Then Exit Function
    p = GlobalLock(hMem)
    If p = 0 Then Exit Function
    CopyMemory p, StrPtr(texte & vbNullChar), nbOctets
    GlobalUnlock hMem
    If OpenClipboard(0) = 0 Then Exit Function
    EmptyClipboard
    SetClipboardData CF_UNICODETEXT, hMem
    CloseClipboard
    CopierDansPressePapiers = True
    Exit Function
Echec:
    CopierDansPressePapiers = False
End Function

' Forme Unicode composée (NFC) : « e » + accent séparé (noms venant d'un Mac) devient « é ».
Public Function NFC(ByVal s As String) As String
    NFC = s
    If Len(s) = 0 Then Exit Function
    If EstAscii(s) Then Exit Function
    On Error GoTo Fin
    Dim n As Long, buf As String
    n = NormalizeString(1, StrPtr(s), Len(s), 0, 0)
    If n <= 0 Then Exit Function
    buf = String$(n, vbNullChar)
    n = NormalizeString(1, StrPtr(s), Len(s), StrPtr(buf), n)
    If n > 0 Then NFC = Left$(buf, n)
Fin:
End Function

' Décode des octets UTF-8. Renvoie False si les octets ne sont pas de l'UTF-8 valide.
Public Function DecoderUtf8(octets() As Byte, ByRef resultat As String) As Boolean
    On Error GoTo Echec
    Dim n As Long, taille As Long
    taille = UBound(octets) - LBound(octets) + 1
    If taille <= 0 Then resultat = "": DecoderUtf8 = True: Exit Function
    n = MultiByteToWideChar(65001, MB_ERR_INVALID_CHARS, VarPtr(octets(LBound(octets))), taille, 0, 0)
    If n = 0 Then Exit Function
    resultat = String$(n, vbNullChar)
    MultiByteToWideChar 65001, MB_ERR_INVALID_CHARS, VarPtr(octets(LBound(octets))), taille, StrPtr(resultat), n
    DecoderUtf8 = True
    Exit Function
Echec:
    DecoderUtf8 = False
End Function

' Décode des octets Windows-1252 (Latin-1 étendu), l'encodage des import.csv.
Public Function DecoderWindows1252(octets() As Byte) As String
    Dim i As Long, s As String, b As Long
    Dim t1252 As Variant
    ' Caractères 0x80 à 0x9F de Windows-1252 (les autres octets valent leur code)
    t1252 = Array(8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 141, 381, 143, _
                  144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 157, 382, 376)
    s = String$(UBound(octets) - LBound(octets) + 1, " ")
    For i = LBound(octets) To UBound(octets)
        b = octets(i)
        If b >= 128 And b <= 159 Then
            Mid$(s, i - LBound(octets) + 1, 1) = ChrW(t1252(b - 128))
        Else
            Mid$(s, i - LBound(octets) + 1, 1) = ChrW(b)
        End If
    Next i
    DecoderWindows1252 = s
End Function

Public Function EstAscii(ByVal s As String) As Boolean
    Dim i As Long
    For i = 1 To Len(s)
        If AscW(Mid$(s, i, 1)) < 0 Or AscW(Mid$(s, i, 1)) > 127 Then Exit Function
    Next i
    EstAscii = True
End Function
