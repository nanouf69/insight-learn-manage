# UX examens blancs TAXI/VTC — 13 novembre 2026

## État
Implémenté dans l’aperçu, **non publié**. Aucune migration, modification de droits, écriture réelle, modification de réponse/note/snapshot ou appel IA. Aucune tentative réelle démarrée. Sauvegarde préalable des cinq écrans dans `/tmp/eb-ux-before`.

## Modifications
- Confirmation partagée `ExamExitGuard` pour les retours locaux, Retour aux autres matières, onglets Accueil/Notes, navigation interne et historique navigateur. `Rester et terminer` reçoit le focus initial ; Échap reste dans la matière. Quitter rejoue uniquement l’intention de navigation, sans interruption notée ni finalisation, ni suppression de la clé de reprise.
- Fermeture, rechargement et sortie hors application : avertissement natif du navigateur (son texte et ses boutons ne sont pas personnalisables). Une sortie vers un autre document n’autorise pas une modale personnalisée fiable sur tous les navigateurs.
- Alertes non modales 5 minutes/300 s et 2 minutes/120 s, gros caractères, fermables. Marqueurs de présentation par compte/exercice/tentative/attempt dans sessionStorage, aucun contenu pédagogique. Une reprise sous deux minutes montre seulement l’alerte deux minutes ; une alerte déjà montrée n’est pas rejouée après rechargement du même onglet. Un autre navigateur/appareil peut montrer son propre avertissement : aucune nouvelle règle serveur ajoutée.
- Affichage calculé depuis les secondes confirmées par le serveur et une ancre monotone (`performance.now`), sans soustraire un tick à la fois. Les ticks manqués n’offrent pas de temps supplémentaire. Une panne de lecture ne réinitialise plus à une durée complète inventée : ancre existante conservée, sinon `--:--`. La fonction serveur existante a été lue : début enregistré une seule fois par compte/exercice/tentative, temps basé sur `clock_timestamp()`.
- Calculatrice positionnée dans le flux sous le bandeau, fermable, largeur limitée. Aucune couche flottante au-dessus des commandes. Touches via Button et couleurs sémantiques. Commandes de navigation peuvent revenir à la ligne sur les écrans étroits.

## Tests exécutés
**33 tests Vitest PASS, 4 fichiers** : `exam-ux-policy`, `examen-cloture-comportement`, `terminer-matiere-panne-recuperation`, `examens-blancs-snapshot-fige`.

**8 parcours Playwright Chromium PASS**, vrais composants PassageMatiere/TimerBadge/Calculatrice/ExamExitGuard avec identité et service entièrement fictifs, requêtes externes interceptées avant ouverture : TAXI et VTC, 1280×1800, 768×1024, 390×844 et 320×640.

Scénarios : focus par défaut ; rester et quitter ; chronomètre continue pendant confirmation ; réponse relue identique ; calcul 7+8=15 ; absence de recouvrement des commandes précédente/suivante et débordement horizontal ; deux alertes au temps fourni par le service fictif ; pas de répétition après retour/rechargement ; navigation Notes, retour navigateur refusé puis accepté ; refus du rechargement via confirmation native. Pas de finalisation ni modification du témoin. Zéro erreur JavaScript navigateur, zéro écriture vers le service réel.

Captures ordinateur/mobile/tablette inspectées. Dernier signal observé : **build OK, 16:44:48 UTC**.

## Limites et publication
- Pas de session élève réelle utilisée : démarrer une matière réelle écrirait un timer/tentative, contraire à la consigne de conservation. Les essais utilisent une session fictive dans les vrais écrans ; les droits et parcours hébergés réels ne sont pas revendiqués comme vérifiés.
- iOS Safari/Android/tablette physiques non testés ; Chromium aux tailles correspondantes testé.
- Lectures périodiques préexistantes du chrono, de la file et de la liste laissées en place : divergence avec règle zéro polling signalée, sans refonte du circuit dans ce lot.
- Alertes une fois par épreuve dans le même onglet/rechargement, pas déduplication globale entre appareils. Une garantie multi-appareils nécessiterait un journal serveur séparé et une autorisation additionnelle.
- Aucun appel de publication effectué. La version publique reste inchangée. Autres chantiers non traités.