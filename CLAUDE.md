# Fonctionnement des tiles de chemin. 
Partons du principe que le fond de la map est forcément de type "herbe". On le note H.

Quand on passe en mode dessin de chemin, on doit selectionner 15 tiles de type chemin. 
Ces 15 tiles représentent les transistions entre le type "herbe" et le type "chemin". 
On les note C01, C02, ..., C15.
Elles sont arrangées comme ceci :
C01 C02 C03 C04 C05
C06 C07 C08 C09 C10
C11 C12 C13 C14 C15

C07 est la tile de base de type chemin

selon comment sont placées les tiles de chemin, on utilisera des tiles de transitions particulières (C01 à C06 et C08 à C15) pour créer des transitions fluides entre l'herbe et le chemin.

Quand on est en mode de dessin de chemin, on ne dessin que des tiles C07 pendant le déplacement de la souris.

Une fois qu'on a terminé de dessiner le chemin, on doit analyser les tiles de chemin et appliquer les transitions appropriées.

Par exemple si on ne vennait à modifier qu'une case , on aurait dans le cas suivant :
___ ___ ___
___ C07 ___
___ ___ ___
Après le laché de clic 
C01 C02 C03
C06 C07 C08
C11 C12 C13

Si on considère une cellule avec une tile C07, alors on doit vérifier les 8 cases autour.

C07
___


___
C07


___ C07


C07 ___


C07 ___
___ ___


___ C07
___ ___


___ ___
C07 ___


___ ___
___ C07



Ce qui donne les transitions suivantes :
C07 C08
C12 C13


C06 C07
C11 C12


C07
C12
       

C01 C02
C06 C07


C06 C07


C07 C07
C09 C07
       

C02 C03
C07 C08


C07 C08


C07 C07
C07 C10
       

C02
C07


C07 C05
C07 C07


C04 C07
C07 C07






