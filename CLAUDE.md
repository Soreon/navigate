Voici un fichier explicatif expliquant le fonctionnement des tiles de chemin. 
Partons du principe que le fond de la map est forcément de type "herbe". On le note H.

Quand on passe en mode dessin de chemin, on doit selectionner 15 tiles de type chemin. 
Ces 15 tiles représentent les transistions entre le type "herbe" (H) et le type "chemin" (C). 
On les note C01, C02, ..., C15.
Elles sont arrangées comme ceci :
C01 C02 C03 C04 C05
C06 C07 C08 C09 C10
C11 C12 C13 C14 C15

Imaginons que chaque tile de chemin (C) soit subdivisée en 4 parties.
Alors on peut les représenter comme suit (avec H pour herbe et C pour chemin)

C01= (Coin de terre en bas à droite)
H H
H C

C02= (Terre en bas)
H H
C C 

C03= (Coin de terre en bas à gauche)
H H
C H

C04= (Coin d'herbe en haut à gauche)
H C
C C

C05= (Coin d'herbe en haut à droite)
C H
C C

C06= (Terre à droite)
H C
H C

C07= (Chemin)
C C
C C 

C08= (Terre à gauche)
C H
C H

C09= (Coin d'herbe en bas à gauche)
C C 
H C

C10= (Coin d'herbe en bas à droite)
C C
C H

C11= (Coin de terre en haut à droite)
H C 
H H

C12= (Terre en haut)
C C 
H H

C13= (Coin de terre en haut à gauche)
C H
H H 

C14= (Chemin alternatif 1)
C C
C C 

C15= (Chemin alternatif 2)
C C
C C 