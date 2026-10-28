# Livres de formation (modules 70–73) — audit et état au 28/10/2026 ~13:20 UTC

## 1. Audit fiches / définitions / QRC contre les 4 livres corrigés
Méthode : texte des fiches Word (Definitions_*, Bilan_QRC_*) comparé question par question au texte lu sur les pages rendues des livres (OCR, pages : TAXI 40–76, VTC 36–72, TA 10–22, VA 6–20). Les écarts signalés par l'outil ont été relus un par un ; la plupart venaient de la lecture des pastilles « Q » (bruit), pas du contenu.

| Formation | Élément | Fiche (avant) | Livre (page) | Décision |
|---|---|---|---|---|
| VTC + TAXI | Définition 1 « Honorabilité » | « Le fait d'avoir un casier judiciaire n°2 (B2) vierge. » | TAXI p.40 / VTC p.36 : « vierge de toute condamnation incompatible… » | **Corrigée** dans une nouvelle version `Definitions_VTC_2026-10-28.docx` / `Definitions_Taxi_2026-10-28.docx` (ancien fichier conservé) |
| TA | QRC « autorités compétentes pour délivrer une ADS » (cours QRC affiché, module 37 / 28) | « Soit le maire, soit le préfet de police » | TA p.14 / TAXI p.67 : maire, président de l'EPCI ou de la Métropole (Lyon), préfet de police à Paris, préfet pour les aéroports | **Corrigée** à l'affichage du cours (texte de révision, pas de note) |
| TAXI/TA examens blancs | Même question, réponse attendue « Les mairies. » (versions d'examen publiées, modules 90006/90012, 11, 13) | — | idem | **NON modifiée** : changer une réponse attendue d'examen blanc exige une nouvelle version + publication explicite (règle noyau). Proposition à valider. |
| VA | QRC « 4 moyens de communication » | SMS au lieu de réseaux sociaux | p.9 | Les deux sont justes : inchangé |
| VA | Monôme / binôme, mercatique, retard client | formulations plus courtes/longues | p.10–11 | Même sens : inchangé |
| VTC | QRC 11 « documents inscription registre » | présent dans la fiche | absent du livre | Pas de contradiction : inchangé |
| Toutes | Fiches = 9–11 définitions, livres = 32–33 | — | — | Les livres sont plus complets ; aucune autre contradiction trouvée |

Limites : lecture OCR (pas de texte exploitable dans les PDF, structure endommagée) ; tableaux/schémas des pages de cours non comparés ; questions des quiz e-learning et examens blancs non toutes recomparées (seule la question ADS a été retrouvée en contradiction lors de cette passe).

Historique : aucune réponse, note, tentative, statut de module ou jalon modifié. Anciennes fiches toujours servies à leur ancienne adresse.

## 2. Accès et sécurité (tests réels)
- Admin (compte réel admin) : 4 livres, dernière page, PDF original (VTC 17,8 Mo, TAXI 20,2 Mo, TA 7,1 Mo, VA 4,0 Mo) — PASS.
- Anonyme → 401 ; jeton invalide → 401 (était 500, corrigé) ; formation/action invalide → 400 ; page hors livre → 400 (était 500, corrigé) — PASS.
- Liens de pages expirés après 130 s → refusés (400) — PASS.
- Adresses publiques du stockage (pages, original, archives) → refusées — PASS.
- Élève technique VTC (tests précédents) : VTC seul, autres et original refusés — PASS antérieur.
- Élèves TAXI / TA / VA réels : **NON PROUVÉ** — aucun compte technique non admin de ces formations ; connexion d'un autre compte bloquée (approbation indisponible). Correspondance des types en base vérifiée : 15 ta + 1 ta-e → module 72, 10 taxi + 4 taxi-e → 71, 1 va-e → 73, 51 vtc + 16 vtc-e → 70 ; tous reconnus par le contrôle serveur.
- Aperçu élève (compte admin) bureau / tablette / mobile, 4 livres : page 1 affichée, page suivante au clic/au toucher, aucun lien PDF brut — PASS.
- Données enregistrées modules 70–73 : aucune ligne → rien ne masque la visionneuse — PASS.
- Bouton « Imprimer toutes les fiches » : ouvrait un onglet invalide pour le livre ; corrigé (livres exclus).

## 3. Anciens PDF publics (8 octobre)
- Archivés en privé : `livres-formation/archives/2026-10-08-final/{vtc,taxi,ta,va}.pdf` (empreintes identiques aux originaux).
- Plus aucune référence dans le code actif ni dans le site en ligne actuel.
- **Exposition résiduelle** : les 4 anciennes adresses publiques répondent toujours (200) à qui possède le lien. Elles sont citées comme texte dans le calcul figé des relevés ; suppression non faite tant que cette dépendance n'est pas résolue. La protection n'est donc pas totale.

## 4. État production
- Site en ligne : contient déjà la visionneuse protégée (aucune référence aux anciens livres).
- Fonction serveur et stockage privé : actifs, correctifs d'erreurs déployés.
- Non publiés : nouvelles fiches Définitions VTC/TAXI, réponse ADS TA du cours, correctif du bouton Imprimer.
