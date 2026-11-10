Attribute VB_Name = "Feuil1"
Attribute VB_Base = "0{00020820-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Option Explicit

' Une cellule corrigée perd sa couleur et sa note de contrôle (relancer « Vérifier » ensuite)
Private Sub Worksheet_Change(ByVal Target As Range)
    On Error Resume Next
    RetirerMarquesModifiees Target
End Sub
