Attribute VB_Name = "ThisWorkbook"
Attribute VB_Base = "0{00020819-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Option Explicit

' À l'ouverture : le mode d'emploi si le tableau est vide, sinon le tableau
Private Sub Workbook_Open()
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = FeuilleTravail()
    If DerniereLigne(ws) < PREMIERE_LIGNE Then
        ThisWorkbook.Worksheets("READ ME").Activate
    Else
        ws.Activate
    End If
    Application.StatusBar = "Import WebFactory : toutes les actions sont dans l'onglet « Import WebFactory » du ruban. Mode d'emploi : onglet « READ ME »."
    Application.OnTime Now + TimeValue("00:00:10"), "EffacerBarreEtat"
End Sub
