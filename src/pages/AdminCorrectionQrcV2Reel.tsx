// Correction QRC V2 — branchée sur le VRAI noyau sécurisé en base.
// Aucune donnée historique n'est complétée ni recalculée : ce qui manque est signalé.
// Le regroupement des passages suit les sessions réelles du CRM (lecture seule),
// jamais une session reconstruite à partir de la date ou de l'heure d'un passage.
import { ebsLesPlusRecents, PREFIXE_EN_COURS } from "@/features/correction-qrc-v2/marquageEbEnCours";
import { PanneauRapprochement } from "@/features/correction-qrc-v2/PanneauRapprochement";
import { proposerPrenote, tracePrenote } from "@/features/correction-qrc-v2/prenote";
import { celluleCompacte, LARGEURS_MATRICE, largeurMinimaleMatrice } from "@/features/correction-qrc-v2/celluleCompacte";
import { ordonnerCandidatsParFin } from "@/features/correction-qrc-v2/ordreCandidats";
import { copieVoisine, decisionApresCorrection, type DirectionCopie } from "@/features/correction-qrc-v2/navigationCopies";
import { nombrePassagesCroises } from "@/features/correction-qrc-v2/rattachementCrm";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CommentairesPredefinis } from "@/features/correction-qrc-v2/CommentairesPredefinis";
import { ajouterCommentaireQrc } from "@/features/correction-qrc-v2/commentairesPredefinis";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { CopiesHistoriquesLecture } from "@/features/correction-qrc-v2/CopiesHistoriquesLecture";
import { commentaireConfirme, cleOperationCommentaire, versionCommentaire } from "@/features/correction-qrc-v2/commentaireSeul";
import { chargerConsultationEb2, commenterQrcHistorique, estConsultation, lireHistoriqueQrcHistorique, noterQrcHistorique, reconnaissanceRemise, reviserQrcHistorique, verifierLiaisonHistoriqueServeur, type InfosHistorique } from "@/features/correction-qrc-v2/eb2Consultation";
import {
  chargerSessionTest,
  commenterQrc,
  corrigerQrc,
  lireHistoriqueQrc,
  listerGroupesCrm,
  origineCorrection,
  reviserQrc,
  souscrireSignal,
  type EvenementCorrection,
  type GroupeSessionCrm,
  type QrcReelle,
  type SessionReelle,
  type TentativeReelle,
} from "@/features/correction-qrc-v2/noyauReel";
import { supabase } from "@/integrations/supabase/client";
import { SynchronisationNotes } from "@/features/surveillance-examens/SynchronisationNotes";
import { CouvertureCorrigesAdmin } from "@/features/correction-qrc-v2/CouvertureCorrigesAdmin";
import { CORRIGES_TROIS_SURFACES_ACTIFS } from "@/lib/corrigesSourcesActivation";
import {
  compterCopiesEnAttenteIa,
  definirIaActif,
  LIBELLES_MOTIF_IA,
  lireConfigIa,
  lireCorrectionsIa,
  lireDemandesVerification,
  type ConfigIa,
  type CorrectionIa,
  type DemandeVerification,
} from "@/features/correction-qrc-v2/correctionIa";

const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

const param = (cle: string) => new URLSearchParams(window.location.search).get(cle);

export default function AdminCorrectionQrcV2Reel() {
  const mode: "test" | "migre" = param("mode") === "test" ? "test" : "migre";

  // Préférences d'interface mémorisées dans l'URL pour survivre à un F5.
  // Les données pédagogiques sont TOUJOURS rechargées depuis le serveur ; l'URL ne porte que la navigation.
  const majUrl = (maj: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(maj)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const [groupes, setGroupes] = useState<GroupeSessionCrm[]>([]);
  // Liste affichée depuis la mémoire de l'onglet, en attente de la relecture serveur.
  // Nouveaux passages signalés par le temps réel : la liste complète n'est relue que sur demande.
  const [nouveauxPassages, setNouveauxPassages] = useState(false);
  const [relectureListe, setRelectureListe] = useState(false);
  const [groupeCle, setGroupeCleState] = useState<string | null>(() => param("qrc_groupe"));
  const [ebCle, setEbCleState] = useState<string | null>(() => param("qrc_eb"));
  // Filtre facultatif sur une seule date de passage à l'intérieur de l'EB choisi.
  const [jourFiltre, setJourFiltreState] = useState<string | null>(() => param("qrc_date"));
  const [session, setSession] = useState<SessionReelle | null>(null);
  const [lectureCopies, setLectureCopies] = useState(false);
  const generationRef = useRef(0);
  const [selection, setSelectionState] = useState<string | null>(() => param("qrc"));
  const [zoom, setZoomState] = useState<number>(() => {
    const z = Number(param("qrc_zoom"));
    return Number.isFinite(z) && z >= 70 && z <= 150 ? z : 100;
  });
  // Répartition de l'écran en pourcentage : 50/50 par défaut, ajustable de 35/65 à 65/35.
  const [partPanneau, setPartPanneau] = useState<number>(() => {
    const l = Number(sessionStorage.getItem("qrc_v2_part_panneau"));
    return Number.isFinite(l) && l >= 35 && l <= 65 ? l : 50;
  });
  const [pleinEcran, setPleinEcran] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const setGroupeCle = (cle: string | null) => {
    generationRef.current++;
    setSession(null);
    setGroupeCleState(cle);
    setEbCleState(null);
    setJourFiltreState(null);
    setSelectionState(null);
    majUrl({ qrc_groupe: cle, qrc_eb: null, qrc_date: null, qrc: null });
  };
  const setEbCle = (cle: string | null) => {
    generationRef.current++;
    setSession(null);
    setEbCleState(cle);
    setJourFiltreState(null);
    setSelectionState(null);
    majUrl({ qrc_eb: cle, qrc_date: null, qrc: null });
  };
  const setJourFiltre = (jour: string | null) => {
    generationRef.current++;
    setSession(null);
    setJourFiltreState(jour);
    setSelectionState(null);
    majUrl({ qrc_date: jour, qrc: null });
  };
  const setSelection = (qrc: string | null) => {
    setSelectionState(qrc);
    majUrl({ qrc });
  };
  const setZoom = (z: number) => {
    const v = Math.min(150, Math.max(70, z));
    setZoomState(v);
    majUrl({ qrc_zoom: String(v) });
  };

  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [etatEnvoi, setEtatEnvoi] = useState<"vide" | "encours" | "ok" | "echec">("vide");
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageNavigation, setMessageNavigation] = useState<string | null>(null);
  // Révision d'une correction déjà validée : action volontaire, jamais un écrasement silencieux.
  const [modeRevision, setModeRevision] = useState(false);
  // Jeton d'intention : identique pour un double-clic (une seule écriture),
  // renouvelé après chaque validation pour qu'une révision ultérieure de même valeur soit bien enregistrée.
  const [jeton, setJeton] = useState(() => Math.random().toString(36).slice(2, 10));
  const [historique, setHistorique] = useState<EvenementCorrection[]>([]);
  const [historiqueCharge, setHistoriqueCharge] = useState(false);
  const [commentaireModifie, setCommentaireModifie] = useState(false);
  const commentaireSauve = historique.at(-1)?.commentaire ?? "";
  const commentaireCourant = commentaireModifie ? commentaire : commentaireSauve;
  const modifierCommentaire = (valeur: string) => {
    setCommentaire(valeur);
    setCommentaireModifie(true);
  };
  const ajouterCommentaire = (texte: string) => {
    modifierCommentaire(ajouterCommentaireQrc(commentaireCourant, texte));
  };

  useEffect(() => {
    void (async () => {
      try {
        const liste = await listerGroupesCrm(mode);
        setGroupes((prev) => (JSON.stringify(prev) === JSON.stringify(liste) ? prev : liste));
        if (!param("qrc_groupe")) {
          setGroupeCleState(liste[0]?.cle ?? null);
          setEbCleState(liste[0]?.examens[0]?.cle ?? null);
          majUrl({ qrc_groupe: liste[0]?.cle ?? null, qrc_eb: liste[0]?.examens[0]?.cle ?? null });
        } else if (!param("qrc_eb")) {
          const g = liste.find((x) => x.cle === param("qrc_groupe"));
          setEbCleState(g?.examens[0]?.cle ?? null);
          majUrl({ qrc_eb: g?.examens[0]?.cle ?? null });
        }
      } catch (e) {
        setErreur((e as Error).message);
      }
    })();
  }, [mode]);

  const groupeChoisi = groupes.find((g) => g.cle === groupeCle) ?? null;
  const ebChoisi = groupeChoisi?.examens.find((e) => e.cle === ebCle) ?? groupeChoisi?.examens[0] ?? null;

  const dateChoisie = ebChoisi?.dates.find((d) => d.jour === jourFiltre) ?? null;
  const ancienCircuit = ebChoisi?.circuit === "ancien";

  // Recherche de candidat (filtrage d'affichage uniquement, aucune écriture).
  const [recherche, setRecherche] = useState("");
  const [nomsCandidats, setNomsCandidats] = useState<Record<string, string>>({});
  const idsGroupe = useMemo(() => {
    const s = new Set<string>();
    for (const g of groupes) for (const e of g.examens) for (const id of Object.values(e.apprenantParAttempt ?? {})) s.add(id);
    return Array.from(s);
  }, [groupes]);
  useEffect(() => {
    const manquants = idsGroupe.filter((id) => !(id in nomsCandidats));
    if (!manquants.length) return;
    let vivant = true;
    void (async () => {
      const out: Record<string, string> = {};
      for (let i = 0; i < manquants.length; i += 150) {
        const { data } = await supabase.from("apprenants").select("id, nom, prenom").in("id", manquants.slice(i, i + 150));
        for (const a of data ?? []) out[a.id] = `${a.nom ?? ""} ${a.prenom ?? ""}`.trim();
      }
      if (vivant) setNomsCandidats((p) => ({ ...p, ...out }));
    })();
    return () => { vivant = false; };
  }, [idsGroupe]); // eslint-disable-line react-hooks/exhaustive-deps
  const normaliser = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const rechercheNorm = normaliser(recherche);
  const candidatsTrouves = useMemo(() => {
    if (!rechercheNorm) return null;
    const mots = rechercheNorm.split(" ");
    return idsGroupe
      .filter((id) => { const n = normaliser(nomsCandidats[id] ?? ""); return mots.every((m) => n.includes(m)); })
      .map((id) => ({
        id,
        nom: nomsCandidats[id] ?? "(apprenant)",
        examens: groupes.flatMap((g) => g.examens
          .filter((e) => Object.values(e.apprenantParAttempt ?? {}).includes(id))
          .map((e) => ({ ...e, groupeCle: g.cle, groupeLibelle: g.libelle }))),
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [rechercheNorm, idsGroupe, nomsCandidats, groupes]); // eslint-disable-line react-hooks/exhaustive-deps
  const idsTrouves = useMemo(() => candidatsTrouves ? new Set(candidatsTrouves.map((c) => c.id)) : null, [candidatsTrouves]);

  // Recherche dans les archives de l'ancien circuit (lecture seule, aucune copie ni migration).
  type ArchivePassage = { cle: string; apprenantId: string; nom: string; libelle: string; resultIds: string[] };
  const [archivesTrouvees, setArchivesTrouvees] = useState<ArchivePassage[]>([]);
  const [archiveOuverte, setArchiveOuverte] = useState<ArchivePassage | null>(null);
  useEffect(() => {
    const mots = rechercheNorm.split(" ").filter((m) => m.length >= 2);
    if (!mots.length) { setArchivesTrouvees([]); return; }
    let annule = false;
    const t = setTimeout(async () => {
      const { data: apps } = await supabase.from("apprenants").select("id, nom, prenom")
        .or(`nom.ilike.%${mots[0]}%,prenom.ilike.%${mots[0]}%`).limit(50);
      const retenus = (apps ?? []).filter((a: any) => {
        const n = normaliser(`${a.nom ?? ""} ${a.prenom ?? ""}`);
        return mots.every((m) => n.includes(m));
      });
      if (!retenus.length) { if (!annule) setArchivesTrouvees([]); return; }
      const { data: res } = await supabase.from("apprenant_quiz_results")
        .select("id, apprenant_id, quiz_id, quiz_titre, completed_at")
        .eq("quiz_type", "examen_blanc").in("apprenant_id", retenus.map((a: any) => a.id))
        .order("completed_at", { ascending: false }).limit(500);
      const groupesArch = new Map<string, ArchivePassage>();
      for (const r of (res ?? []) as any[]) {
        const jour = (r.completed_at ?? "").slice(0, 10);
        const cle = `${r.apprenant_id}|${r.quiz_id}|${jour}`;
        const a: any = retenus.find((x: any) => x.id === r.apprenant_id);
        if (!groupesArch.has(cle)) {
          const d = jour ? jour.split("-").reverse().join("/") : "date inconnue";
          groupesArch.set(cle, { cle, apprenantId: r.apprenant_id, nom: `${a?.nom ?? ""} ${a?.prenom ?? ""}`.trim(), libelle: `${r.quiz_titre ?? r.quiz_id} — ${d}`, resultIds: [] });
        }
        groupesArch.get(cle)!.resultIds.push(r.id);
      }
      if (!annule) setArchivesTrouvees(Array.from(groupesArch.values()));
    }, 300);
    return () => { annule = true; clearTimeout(t); };
  }, [rechercheNorm]); // eslint-disable-line react-hooks/exhaustive-deps

  const attemptsBase = ancienCircuit ? null : (dateChoisie?.attemptIds ?? ebChoisi?.attemptIds ?? null);
  const cleAttempts = idsTrouves
    ? (attemptsBase ?? []).filter((a) => idsTrouves.has(ebChoisi?.apprenantParAttempt?.[a] ?? "")).join(",")
    : (attemptsBase ?? []).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const attemptsAffiches = useMemo(() => (attemptsBase ? (cleAttempts ? cleAttempts.split(",") : []) : null), [cleAttempts, attemptsBase == null]);
  const nbPassagesCroises = nombrePassagesCroises(attemptsAffiches ?? [], ebChoisi?.inscriptionCroiseeParAttempt);
  const legacyResultIds = ancienCircuit
    ? (jourFiltre
        ? ebChoisi?.legacyResultIds?.filter((id) => dateChoisie?.attemptIds.includes(`ancien:${id}`))
        : ebChoisi?.legacyResultIds)
    : undefined;

  // Génération de lecture : une réponse tardive d'une ancienne session/EB n'est jamais affichée.
  const recharger = useCallback(async (): Promise<SessionReelle | null> => {
    const generation = ++generationRef.current;
    if (!attemptsAffiches) { setSession(null); setLectureCopies(false); return null; }
    // Recherche sans passage dans cet EB : session vide (jamais de chargement global).
    if (attemptsAffiches.length === 0) {
      const vide = { tentatives: [], qrc: [], resultats: [], baremesRestaures: [] } as SessionReelle;
      setSession(vide);
      setLectureCopies(false);
      return vide;
    }
    setLectureCopies(true);
    try {
      const relue = await chargerSessionTest(mode, attemptsAffiches);
      if (generation !== generationRef.current) return null;
      setSession(relue);
      return relue;
    } catch (e) {
      if (generation === generationRef.current) setErreur((e as Error).message);
      return null;
    } finally {
      if (generation === generationRef.current) setLectureCopies(false);
    }
  }, [mode, attemptsAffiches]);

  useEffect(() => { void recharger(); }, [recharger]);
  const rechargerRef = useRef(recharger);
  useEffect(() => { rechargerRef.current = recharger; }, [recharger]);
  // Signal temps réel : regroupé (1,5 s) et ignoré pendant notre propre enregistrement,
  // pour ne jamais relancer la lecture complète de toutes les copies à chaque note.
  const envoiEnCoursRef = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arreter = souscrireSignal("admin-qrc-v2", "qrc_instances_v2", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!envoiEnCoursRef.current) void recharger(); }, 1500);
    });
    return () => { clearTimeout(timer); arreter(); };
  }, [recharger]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let actif = true;
    const actualiser = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (envoiEnCoursRef.current) { actualiser(); return; }
        // Passage terminé/repris : relecture des seules copies affichées (fin réelle, ordre).
        // Seules les copies affichées sont relues (léger). La relecture complète de toutes les
        // sessions (~25 s de lecture serveur) n'est plus relancée automatiquement à chaque réponse
        // d'élève : un bouton discret apparaît.
        void rechargerRef.current?.();
        if (actif) setNouveauxPassages(true);
      }, 5000);
    };
    const arreterV2 = souscrireSignal("admin-qrc-v2-passages", "exam_attempts_v2", actualiser);
    // Ancien circuit : signal seulement (aucun scan automatique) ; la liste est relue sur demande.
    const arreterHisto = souscrireSignal("admin-qrc-v2-historique", "apprenant_quiz_results", () => { if (actif) setNouveauxPassages(true); });
    return () => { actif = false; clearTimeout(timer); arreterV2(); arreterHisto(); };
  }, [mode]);
  const actualisationEnCoursRef = useRef(false);
  const actualiserListe = async () => {
    if (actualisationEnCoursRef.current) return;
    actualisationEnCoursRef.current = true;
    setRelectureListe(true);
    try {
      const liste = await listerGroupesCrm(mode);
      setGroupes((prev) => (JSON.stringify(prev) === JSON.stringify(liste) ? prev : liste));
      // Catalogue inchangé : les notes des copies affichées sont tout de même relues
      // (notes IA/humaines modifiées pendant une coupure du temps réel).
      const relue = await rechargerRef.current?.();
      if (relue !== null) { setNouveauxPassages(false); setErreur(null); }
    } catch (e) { setErreur((e as Error).message); }
    finally { actualisationEnCoursRef.current = false; setRelectureListe(false); }
  };

  // Plein écran natif du navigateur sur la zone de correction
  const basculerPleinEcran = async () => {
    if (!document.fullscreenElement) await conteneurRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };
  useEffect(() => {
    const onFs = () => setPleinEcran(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Redimensionnement de la séparation gauche/droite (35/65 → 65/35)
  const demarrerRedim = (e: React.MouseEvent) => {
    e.preventDefault();
    const largeurTotale = conteneurRef.current?.getBoundingClientRect().width || window.innerWidth;
    const move = (ev: MouseEvent) => {
      const gauche = conteneurRef.current?.getBoundingClientRect().left ?? 0;
      const part = ((largeurTotale - (ev.clientX - gauche)) / largeurTotale) * 100;
      setPartPanneau(Math.min(65, Math.max(35, part)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      sessionStorage.setItem("qrc_v2_part_panneau", String(partPanneauRef.current));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const partPanneauRef = useRef(partPanneau);
  useEffect(() => { partPanneauRef.current = partPanneau; }, [partPanneau]);

  // Position de défilement : mémorisée localement, restaurée UNE SEULE FOIS (au retour F5).
  // Un rafraîchissement de données après une correction ne doit jamais déplacer la page.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => sessionStorage.setItem("qrc_v2_scroll", String(window.scrollY)), 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timer) clearTimeout(timer); };
  }, []);
  const scrollRestaure = useRef(false);
  useEffect(() => {
    if (!session || scrollRestaure.current) return;
    scrollRestaure.current = true;
    const y = Number(sessionStorage.getItem("qrc_v2_scroll") ?? 0);
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [session]);

  // Défilement horizontal des tableaux : conservé à l'identique lors d'un rafraîchissement de données.
  const scrollsX = useRef(new Map<string, number>());
  const tableauxRef = useRef(new Map<string, HTMLDivElement | null>());
  useEffect(() => {
    for (const [cle, el] of tableauxRef.current) {
      const x = scrollsX.current.get(cle);
      if (el && x != null && el.scrollLeft !== x) el.scrollLeft = x;
    }
  }, [session]);

  const parTentative = useMemo(() => {
    const m = new Map<string, TentativeReelle>();
    for (const t of session?.tentatives ?? []) m.set(t.attempt_id, t);
    return m;
  }, [session]);

  const baremeRestaureDe = useMemo(() => {
    const m = new Map<string, { bareme: number; mention: string; nb_preuves: number }>();
    for (const b of session?.baremesRestaures ?? []) m.set(b.qrc_instance_id, b);
    return m;
  }, [session]);

  const qrcSel: QrcReelle | undefined = session?.qrc.find((q) => q.qrc_instance_id === selection);
  const tentativeSel = qrcSel ? parTentative.get(qrcSel.attempt_id) : undefined;
  const questionSel = tentativeSel?.snapshot.questions.find((q) => q.id === qrcSel?.question_id);
  const restaureSel = qrcSel ? baremeRestaureDe.get(qrcSel.qrc_instance_id) ?? null : null;
  const baremeSel = questionSel?.points ?? restaureSel?.bareme ?? null;
  const videSel = !texte(qrcSel?.reponseComplete ?? qrcSel?.reponse).trim();
  const proposition = useMemo(() => proposerPrenote(
    texte(qrcSel?.reponseComplete ?? qrcSel?.reponse), questionSel?.reponseQRC ?? '', baremeSel,
  ), [qrcSel?.reponseComplete, qrcSel?.reponse, questionSel?.reponseQRC, baremeSel]);
  const [choixLocal, setChoixLocal] = useState<{ cle: string; note: number } | null>(null);
  const cleProposition = JSON.stringify([selection, qrcSel?.reponseComplete ?? qrcSel?.reponse, questionSel?.reponseQRC, baremeSel]);
  const noteChoisie = qrcSel?.etat === 'corrigee' ? null
    : choixLocal?.cle === cleProposition ? choixLocal.note : proposition.note;

  // ——— Correction IA (lecture seule ici ; l'écriture se fait côté serveur) ———
  const [configIa, setConfigIa] = useState<ConfigIa | null>(null);
  const [emailAdmin, setEmailAdmin] = useState<string | undefined>(undefined);
  const [correctionsIa, setCorrectionsIa] = useState<CorrectionIa[]>([]);
  const [demandes, setDemandes] = useState<DemandeVerification[]>([]);
  useEffect(() => {
    void lireConfigIa().then(setConfigIa);
    void supabase.auth.getUser().then(({ data }) => setEmailAdmin(data.user?.email ?? undefined));
  }, []);
  useEffect(() => {
    const ids = (session?.qrc ?? []).map((q) => q.qrc_instance_id).filter((id) => !estConsultation(id));
    if (!ids.length) { setCorrectionsIa([]); setDemandes([]); return; }
    let vivant = true;
    void Promise.all([lireCorrectionsIa(ids), lireDemandesVerification(ids)]).then(([c, d]) => {
      if (vivant) { setCorrectionsIa(c); setDemandes(d); }
    });
    return () => { vivant = false; };
  }, [session]);
  const demandesOuvertes = useMemo(() => new Set(demandes.filter((d) => d.statut === "a_traiter").map((d) => d.qrc_instance_id)), [demandes]);
  const nbDemandesOuvertes = demandesOuvertes.size;
  const origineSel = qrcSel ? origineCorrection(qrcSel) : "aucune";
  const iaSel = qrcSel ? correctionsIa.filter((c) => c.qrc_instance_id === qrcSel.qrc_instance_id) : [];
  const iaAppliqueeSel = iaSel.find((c) => c.statut === "appliquee");
  const demandesSel = qrcSel ? demandes.filter((d) => d.qrc_instance_id === qrcSel.qrc_instance_id) : [];
  const demandeOuverteSel = demandesSel.some((d) => d.statut === "a_traiter");
  const basculerIa = async () => {
    if (!configIa) return;
    const cible = !configIa.actif;
    if (cible) {
      const msg = "ACTIVER la correction IA automatique des QRC e-learning ?\n\nSeuls les passages terminés À PARTIR DE MAINTENANT seront corrigés par Gemini 3.8 Flash. Aucune ancienne copie ne sera touchée.";
      if (!window.confirm(msg)) return;
    } else {
      let enAttente: { reponses: number; passages: number } | null = null;
      try { enAttente = await compterCopiesEnAttenteIa(); } catch { enAttente = null; }
      const detail = enAttente
        ? `${enAttente.reponses} réponse(s) écrite(s) e-learning (${enAttente.passages} passage(s)) attendent actuellement la correction IA.`
        : "Le nombre de copies en attente n'a pas pu être vérifié.";
      const msg = `DÉSACTIVER la correction IA ?\n\n${detail}\nAprès la coupure, les nouvelles copies e-learning resteront « En attente » jusqu'à une correction par un formateur ou une réactivation manuelle. La correction IA ne se réactive JAMAIS automatiquement.\n\nLes corrections déjà enregistrées restent inchangées.`;
      if (!window.confirm(msg)) return;
      if (!window.confirm("Confirmation finale : couper la correction IA maintenant ?")) return;
    }
    try {
      await definirIaActif(cible, emailAdmin);
      setConfigIa(await lireConfigIa());
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  // Historique des corrections (lecture seule) : l'ancienne note n'est jamais effacée.
  useEffect(() => {
    setHistorique([]);
    setHistoriqueCharge(false);
    if (!selection) { setHistorique([]); return; }
    let vivant = true;
    if (estConsultation(selection)) {
      const q = session?.qrc.find((x) => x.qrc_instance_id === selection);
      const t = q ? session?.tentatives.find((x) => x.attempt_id === q.attempt_id) : undefined;
      const h = (t as unknown as { historique?: InfosHistorique } | undefined)?.historique;
      if (!q || !h) { setHistorique([]); return; }
      void lireHistoriqueQrcHistorique(h.result_id, q.question_id)
        .then((r) => { if (vivant) { setHistorique(r as unknown as EvenementCorrection[]); setHistoriqueCharge(true); } }).catch(() => undefined);
      return () => { vivant = false; };
    }
    void lireHistoriqueQrc(selection).then((h) => { if (vivant) { setHistorique(h); setHistoriqueCharge(true); } }).catch(() => undefined);
    return () => { vivant = false; };
  }, [selection, session]);
  useEffect(() => { setModeRevision(false); setMessageNavigation(null); setCommentaire(""); setCommentaireModifie(false); }, [selection]);

  const total = session?.qrc.length ?? 0;
  const corrigees = session?.qrc.filter((q) => q.etat === "corrigee").length ?? 0;
  // Périmètre candidat : QRC du seul candidat sélectionné pour cet examen
  // (toutes ses matières), distinct du total de la session affichée.
  const qrcCandidat = qrcSel ? (session?.qrc ?? []).filter((q) => q.apprenant_id === qrcSel.apprenant_id) : [];
  const totalCandidat = qrcCandidat.length;
  const corrigeesCandidat = qrcCandidat.filter((q) => q.etat === "corrigee").length;

  const matieres = useMemo(() => {
    const m = new Map<string, { subject_id: string; lettre: string; titre: string }>();
    for (const t of session?.tentatives ?? []) {
      for (const mat of t.snapshot.matieres ?? []) if (!m.has(mat.subject_id)) m.set(mat.subject_id, mat);
    }
    return Array.from(m.values()).sort((a, b) => (a.lettre ?? "").localeCompare(b.lettre ?? ""));
  }, [session]);

  const histoSel = qrcSel && estConsultation(qrcSel.qrc_instance_id)
    ? ((tentativeSel as unknown as { historique?: InfosHistorique } | undefined)?.historique ?? null)
    : null;
  const valider = async (valeur?: number, confirmationIa = false) => {
    const n = valeur ?? note;
    if (!qrcSel || n === null || n === undefined) return;
    if (etatEnvoi === "encours") return;
    const histo = estConsultation(qrcSel.qrc_instance_id)
      ? ((tentativeSel as unknown as { historique?: InfosHistorique })?.historique ?? null)
      : null;
    if (estConsultation(qrcSel.qrc_instance_id)) {
      // Copie historique sans fiche V2 : jamais de réécriture d'une QRC déjà validée.
      if (!histo || histo.score_obtenu == null) return;
    }
    const revision = qrcSel.etat === "corrigee";
    // Note IA non vérifiée : cliquer la note proposée la confirme (devient humaine), sans étape intermédiaire.
    const surIa = revision && origineSel === "ia";
    if (surIa && n === qrcSel.note) confirmationIa = true;
    if (revision && !confirmationIa && n === qrcSel.note) {
      // Même note : seul le commentaire peut changer, sans révision de note ni recalcul.
      if (commentaireModifie && commentaireCourant !== commentaireSauve) await enregistrerCommentaireSeul();
      else { setErreur(null); setMessageNavigation("Note identique et commentaire inchangé : rien à enregistrer."); }
      return;
    }
    if (revision && !historiqueCharge) {
      setErreur("Commentaire existant non relu : réessayez après rechargement de cette copie.");
      setEtatEnvoi("echec");
      return;
    }
    const auto = !revision && baremeSel != null && proposition.autoValidable && proposition.note === baremeSel && n === baremeSel;
    const traceProposition = !revision && baremeSel != null
      ? (auto ? `[VALIDATION AUTO ${proposition.regle}] ${n}/${baremeSel} — ${proposition.motif}` : tracePrenote(proposition, n, baremeSel))
      : undefined;
    const commentaireValidation = [commentaireCourant, traceProposition].filter(Boolean).join('\n');
    const ancienne = qrcSel.note;
    if (revision) {
      const fmt = (v: number | null) => `${String(v).replace(".", ",")}${baremeSel != null ? `/${baremeSel}` : ""}`;
      const msg = confirmationIa
        ? `Confirmer la note IA ${fmt(n)} ? Elle deviendra une correction humaine vérifiée.`
        : `Modifier la correction de ${fmt(ancienne)} à ${fmt(n)} ?`;
      // Remplacement d'une proposition IA : enregistrement immédiat au clic (aucune note humaine écrasée).
      if (!surIa && !window.confirm(msg)) return;
    }
    setNote(n);
    envoiEnCoursRef.current = true;
    const t0 = performance.now();
    setEtatEnvoi("encours");
    setErreur(null);
    setMessageNavigation(null);
    try {
      if (!tentativeSel || tentativeSel.apprenant_id !== qrcSel.apprenant_id
        || tentativeSel.attempt_id !== qrcSel.attempt_id
        || !questionSel || questionSel.id !== qrcSel.question_id
        || (histo && tentativeSel.attempt_id !== `consultation:${histo.result_id}`)) {
        throw new Error("Note non enregistrée : la liaison entre la copie, la question et l’élève est incohérente. Rechargez cette copie ; aucune note n’a été attribuée.");
      }
      if (histo) {
        // Read this original copy again: a stale grid or a partial old read cannot decide its provenance.
        const copieActuelle = await chargerConsultationEb2([`consultation:${histo.result_id}`]);
        const actuelle = copieActuelle.tentatives.find(t => t.attempt_id === tentativeSel.attempt_id);
        const infos = (actuelle as (TentativeReelle & { historique?: InfosHistorique }) | undefined)?.historique;
        if (!actuelle || actuelle.apprenant_id !== qrcSel.apprenant_id || !infos || infos.result_id !== histo.result_id
          || !copieActuelle.qrc.some(q => q.qrc_instance_id === qrcSel.qrc_instance_id && q.apprenant_id === qrcSel.apprenant_id)) {
          throw new Error("Note non enregistrée : identité de la copie non confirmée par la relecture serveur.");
        }
        const provenance = infos.preuveServeurRequise
          ? await verifierLiaisonHistoriqueServeur(histo.result_id, qrcSel.apprenant_id)
          : infos.provenance;
        const reconnaissance = reconnaissanceRemise(provenance, histo.result_id, qrcSel.question_id);
        if (revision) {
          await reviserQrcHistorique({
            operationId: `qrchistrev:${histo.result_id}:${qrcSel.question_id}:${ancienne}:${n}:${jeton}`,
            resultId: histo.result_id,
            questionId: qrcSel.question_id,
            note: n,
            noteAttendue: ancienne as number,
            scoreAttendu: histo.score_obtenu as number,
            seuil: histo.seuil,
            commentaire: commentaireCourant || (confirmationIa ? "Note IA confirmée par le formateur" : undefined),
            reconnaissance,
          });
        } else {
          await noterQrcHistorique({
            // identité déterministe : double-clic / plusieurs appareils = une seule correction
            operationId: `qrchist:${histo.result_id}:${qrcSel.question_id}:${n}:${jeton}`,
            resultId: histo.result_id,
            questionId: qrcSel.question_id,
            note: n,
            scoreAttendu: histo.score_obtenu as number,
            seuil: histo.seuil,
            commentaire: commentaireValidation || undefined,
            reconnaissance,
          });
        }
      } else if (revision) {
        await reviserQrc({
          // identité déterministe : double-clic ou 10 envois = une seule révision
          operationId: `qrcv2rev:${qrcSel.qrc_instance_id}:${ancienne}:${n}:${jeton}`,
          qrcInstanceId: qrcSel.qrc_instance_id,
          attemptId: qrcSel.attempt_id,
          note: n,
          noteAttendue: ancienne as number,
          commentaire: commentaireCourant || (confirmationIa ? "Note IA confirmée par le formateur" : undefined),
          email: emailAdmin,
        });
      } else {
        await corrigerQrc({
          // identité déterministe : 10 envois = une seule correction
          operationId: `qrcv2:${qrcSel.qrc_instance_id}:${n}`,
          qrcInstanceId: qrcSel.qrc_instance_id,
          attemptId: qrcSel.attempt_id,
          note: n,
          commentaire: commentaireValidation || undefined,
          email: emailAdmin,
        });
      }

      // Aucune navigation sur la seule promesse d'écriture : la QRC relue doit
      // porter exactement la note choisie et l'état corrigé.
      // Copie historique : relecture ciblée de cette seule copie (rapide), fusionnée dans la grille ;
      // le rechargement complet de toutes les copies prenait jusqu'à ~30 s sous charge.
      const sessionRelue = histo && session
        ? await (async () => {
            if (!tentativeSel) throw new Error('Identité de copie absente.');
            const id = tentativeSel.attempt_id;
            const copie = await chargerConsultationEb2([id]);
            const fusion: SessionReelle = {
              ...session,
              tentatives: session.tentatives.map((t) => copie.tentatives.find((c) => c.attempt_id === t.attempt_id) ?? t),
              qrc: session.qrc.map((q) => (q.attempt_id === id ? copie.qrc.find((c) => c.qrc_instance_id === q.qrc_instance_id) ?? q : q)),
              resultats: [...session.resultats.filter(r => r.attempt_id !== id), ...copie.resultats],
            };
            setSession(fusion);
            return fusion;
          })()
        : session && tentativeSel
          ? await (async () => {
              // Relecture serveur ciblée de la seule copie corrigée (après commit), fusionnée
              // dans la grille : jamais de rechargement complet de toutes les copies.
              const id = tentativeSel.attempt_id;
              const copie = await chargerSessionTest(mode, [id]);
              if (!copie.tentatives.some((t) => t.attempt_id === id)) return await recharger();
              const fusion: SessionReelle = {
                ...session,
                tentatives: session.tentatives.map((t) => copie.tentatives.find((c) => c.attempt_id === t.attempt_id) ?? t),
                qrc: [
                  ...session.qrc.map((q) => (q.attempt_id === id ? copie.qrc.find((c) => c.qrc_instance_id === q.qrc_instance_id) ?? q : q)),
                  ...copie.qrc.filter((c) => !session.qrc.some((q) => q.qrc_instance_id === c.qrc_instance_id)),
                ],
                resultats: [...session.resultats.filter((r) => r.attempt_id !== id), ...copie.resultats],
                baremesRestaures: [
                  ...(session.baremesRestaures ?? []).filter((b) => !copie.qrc.some((q) => q.qrc_instance_id === b.qrc_instance_id)),
                  ...(copie.baremesRestaures ?? []),
                ],
              };
              setSession(fusion);
              return fusion;
            })()
          : await recharger();
      if (import.meta.env.DEV) console.info(`[qrc-v2] note enregistrée et relue en ${Math.round(performance.now() - t0)} ms`);
      const decision = decisionApresCorrection(sessionRelue, qrcSel.qrc_instance_id, n);
      if (decision.statut === "non_confirmee") {
        setEtatEnvoi("echec");
        setErreur("La sauvegarde n'a pas pu être confirmée par relecture. La copie reste affichée ; aucune navigation automatique n'a été effectuée.");
        return;
      }
      if (commentaireModifie) {
        const journalRelu = histo
          ? await lireHistoriqueQrcHistorique(histo.result_id, qrcSel.question_id)
          : await lireHistoriqueQrc(qrcSel.qrc_instance_id);
        const dernierCommentaire = journalRelu.at(-1)?.commentaire ?? "";
        const attendu = revision ? commentaireCourant : commentaireValidation;
        if (dernierCommentaire !== attendu) {
          setEtatEnvoi("echec");
          setErreur("La note a été relue, mais le commentaire n’a pas été confirmé. Votre texte reste affiché ; ne changez pas de copie.");
          return;
        }
      }

      setNote(null);
      setCommentaire("");
      setCommentaireModifie(false);
      setModeRevision(false);
      setJeton(Math.random().toString(36).slice(2, 10));
      if (decision.suivante) {
        setEtatEnvoi("vide");
        setSelection(decision.suivante.qrc_instance_id);
      } else {
        setEtatEnvoi("ok");
        setMessageNavigation("Correction enregistrée — dernière copie de la liste.");
      }
    } catch (e) {
      setEtatEnvoi("echec");
      setErreur((e as Error).message);
    } finally {
      envoiEnCoursRef.current = false;
    }
  };

  // Commentaire seul sur une QRC déjà corrigée : écriture append-only dédiée, note jamais renvoyée ni modifiée.
  const enregistrerCommentaireSeul = async () => {
    if (!qrcSel || qrcSel.etat !== "corrigee" || qrcSel.note == null || etatEnvoi === "encours") return;
    if (!historiqueCharge) {
      setErreur("Commentaire existant non relu : réessayez après rechargement de cette copie.");
      setEtatEnvoi("echec");
      return;
    }
    const texte = commentaireCourant;
    const noteActuelle = Number(qrcSel.note);
    const histo = estConsultation(qrcSel.qrc_instance_id)
      ? ((tentativeSel as unknown as { historique?: InfosHistorique })?.historique ?? null)
      : null;
    if (texte === commentaireSauve) {
      setCommentaireModifie(false);
      setMessageNavigation("Commentaire déjà enregistré.");
      return;
    }
    setEtatEnvoi("encours");
    setErreur(null);
    setMessageNavigation(null);
    try {
      if (!tentativeSel || tentativeSel.apprenant_id !== qrcSel.apprenant_id || tentativeSel.attempt_id !== qrcSel.attempt_id
        || !questionSel || questionSel.id !== qrcSel.question_id
        || (histo && tentativeSel.attempt_id !== `consultation:${histo.result_id}`)) {
        throw new Error("Commentaire non enregistré : la liaison entre la copie, la question et l’élève est incohérente. Rechargez cette copie.");
      }
      const version = versionCommentaire(historique);
      if (histo) {
        await commenterQrcHistorique({
          operationId: cleOperationCommentaire(`${histo.result_id}:${qrcSel.question_id}`, version, texte, jeton),
          resultId: histo.result_id,
          questionId: qrcSel.question_id,
          noteAttendue: noteActuelle,
          revisionAttendue: version.revision,
          commentaire: texte,
        });
      } else {
        await commenterQrc({
          operationId: cleOperationCommentaire(qrcSel.qrc_instance_id, version, texte, jeton),
          qrcInstanceId: qrcSel.qrc_instance_id,
          noteAttendue: noteActuelle,
          dernierEvenementAttendu: version.dernierEvenement,
          commentaire: texte,
          email: emailAdmin,
        });
      }
      const journalRelu = histo
        ? ((await lireHistoriqueQrcHistorique(histo.result_id, qrcSel.question_id)) as unknown as EvenementCorrection[])
        : await lireHistoriqueQrc(qrcSel.qrc_instance_id);
      if (!commentaireConfirme(journalRelu, texte, noteActuelle)) {
        setEtatEnvoi("echec");
        setErreur("Le commentaire n’a pas été confirmé par relecture. Votre texte reste affiché ; ne changez pas de copie.");
        return;
      }
      setHistorique(journalRelu);
      setCommentaire("");
      setCommentaireModifie(false);
      setJeton(Math.random().toString(36).slice(2, 10));
      setEtatEnvoi("ok");
      setMessageNavigation("Commentaire enregistré — note inchangée.");
    } catch (e) {
      setEtatEnvoi("echec");
      const m = (e as Error).message ?? "";
      setErreur(/CONFLIT|modifiée depuis|P0482|P0409/i.test(m)
        ? "Cette correction a changé entre-temps (autre onglet ou autre correcteur). Rechargez la copie : votre texte reste affiché, rien n’a été écrasé."
        : m);
    }
  };

  const copiePrecedente = copieVoisine(session, selection, -1);
  const copieSuivante = copieVoisine(session, selection, 1);
  const naviguerCopie = (direction: DirectionCopie) => {
    if (etatEnvoi === "encours") return;
    const cible = copieVoisine(session, selection, direction);
    if (!cible) return;
    if (commentaireModifie && commentaire !== commentaireSauve && !window.confirm(
      "Le commentaire de cette copie n'est pas enregistré. Changer de copie le fera perdre. Continuer ?",
    )) return;
    setSelection(cible.qrc_instance_id);
    setNote(null);
    setCommentaire("");
    setEtatEnvoi("vide");
    setErreur(null);
  };
  // Validation automatique : UNIQUEMENT réponse littéralement identique au corrigé figé
  // (normalisation conservatrice : signes, unités, montants, % et négations conservés),
  // note = barème plein, copie non corrigée, provenance prouvée. Une seule tentative par QRC.
  // Toute autre proposition (ex. équivalence B2) n'est qu'une présélection à enregistrer.
  const autoTentees = useRef(new Set<string>());
  useEffect(() => {
    if (!qrcSel || qrcSel.etat === 'corrigee' || videSel || histoSel?.provenance === 'resultat_seul') return;
    if (!proposition.autoValidable) return;
    if (baremeSel == null || proposition.note == null || proposition.note !== baremeSel) return;
    if (etatEnvoi === 'encours' || autoTentees.current.has(qrcSel.qrc_instance_id)) return;
    autoTentees.current.add(qrcSel.qrc_instance_id);
    void valider(baremeSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrcSel?.qrc_instance_id, qrcSel?.etat, proposition.note, proposition.autoValidable, baremeSel, videSel, histoSel?.provenance, etatEnvoi]);

  const navigationCopies = (
    <div className="flex items-center gap-2 border-y py-2" data-testid="navigation-copies">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        data-testid="copie-precedente"
        disabled={etatEnvoi === "encours" || !copiePrecedente}
        onClick={() => naviguerCopie(-1)}
      >
        ← Retour
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        data-testid="copie-suivante"
        disabled={etatEnvoi === "encours" || !copieSuivante}
        onClick={() => naviguerCopie(1)}
      >
        Suivant →
      </Button>
    </div>
  );

  const nbIndetermines = groupes.find((g) => g.type === "indetermine")?.nbCandidats ?? 0;
  const nbConflits = groupes.find((g) => g.type === "conflit")?.nbCandidats ?? 0;

  // Mise en évidence des sessions CRM en cours : date du jour (Paris) comprise
  // entre la date de début et la date de fin incluses — détection dynamique.
  const jourActuel = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const estEnCours = (g: GroupeSessionCrm) =>
    g.type === "crm" && !!g.debut && !!g.fin && jourActuel >= g.debut && jourActuel <= g.fin;
  const libelleGroupe = (g: GroupeSessionCrm) =>
    `${estEnCours(g) ? "🔴 EN COURS — " : ""}${g.libelle}${g.periode ? ` (${g.periode})` : ""} · ${g.nbCandidats} candidat${g.nbCandidats > 1 ? "s" : ""}`;

  const ebsRecents = ebsLesPlusRecents(groupeChoisi, groupeChoisi?.examens ?? [], jourActuel);
  // Panneau tenu ouvert tant qu'une copie est sélectionnée (même pendant une relecture) : largeur stable.
  const panneauOuvert = !ancienCircuit && !!selection;
  return (
    <div ref={conteneurRef} className="flex min-h-screen w-full bg-background">
      <div
        data-testid="zone-tableau"
        className="min-w-0 shrink-0 grow-0 px-2 py-1 space-y-3 overflow-x-auto"
        style={!panneauOuvert
          ? { flex: "0 0 100%", width: "100%" }
          : { flex: `0 0 calc(${100 - partPanneau}% - 3px)`, width: `calc(${100 - partPanneau}% - 3px)` }}
      >
        
        {mode !== "test" && (
          <details data-testid="synchronisation-dans-correcteur" className="rounded border">
            <summary className="cursor-pointer px-2 py-1 text-sm font-semibold">Actualiser les notes (vérification serveur)</summary>
            <SynchronisationNotes compact />
          </details>
        )}
        {mode !== "test" && CORRIGES_TROIS_SURFACES_ACTIFS && (
          <details className="rounded border">
            <summary className="cursor-pointer px-2 py-1 text-sm font-semibold">Couverture des corrigés officiels (lecture seule)</summary>
            <div className="p-2"><CouvertureCorrigesAdmin /></div>
          </details>
        )}
        <header className="sticky top-0 z-10 bg-background/95 py-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">Correction QRC V2</h1>
            <select
              data-testid="choix-session"
              className={`min-w-0 rounded border bg-background px-2 py-1 text-sm max-w-full sm:max-w-[420px] ${groupeChoisi && estEnCours(groupeChoisi) ? "text-red-600 font-semibold" : ""}`}
              value={groupeCle ?? ""}
              onChange={(e) => setGroupeCle(e.target.value)}
            >
              {groupes.map((g) => (
                <option key={g.cle} value={g.cle} className={estEnCours(g) ? "text-red-600 font-semibold" : "text-foreground font-normal"}>
                  {libelleGroupe(g)}
                </option>
              ))}
            </select>
            <select
              data-testid="choix-eb"
              className={`min-w-0 max-w-full rounded border bg-background px-2 py-1 text-sm ${ebChoisi && ebsRecents.has(ebChoisi.cle) ? "text-red-600 font-semibold" : ""}`}
              title={ebChoisi && ebsRecents.has(ebChoisi.cle) ? "Dernier examen blanc réalisé par la session CRM en cours sélectionnée" : undefined}
              value={ebChoisi?.cle ?? ""}
              onChange={(e) => setEbCle(e.target.value)}
            >
              {(groupeChoisi?.examens ?? []).map((e) => (
                <option key={e.cle} value={e.cle} className={ebsRecents.has(e.cle) ? "text-red-600 font-semibold" : undefined}>
                  {ebsRecents.has(e.cle) ? PREFIXE_EN_COURS : ""}{e.exam_id}{e.circuit === "ancien" ? " — ANCIEN CIRCUIT" : ""} — {e.attemptIds.length} passage{e.attemptIds.length > 1 ? "s" : ""}
                  {" · "}
                  {e.dates.map((d) => `${d.date.slice(0, 5)} (${d.attemptIds.length})`).join(" • ")}
                  {Object.keys(e.inscriptionCroiseeParAttempt ?? {}).length > 0
                    ? ` · Inscription croisée : ${Object.keys(e.inscriptionCroiseeParAttempt ?? {}).length}`
                    : ""}
                </option>
              ))}
            </select>
            <div className="relative min-w-0 max-w-full">
              <input
                data-testid="recherche-candidat"
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un candidat par nom ou prénom"
                aria-label="Rechercher un candidat par nom ou prénom"
                className="w-72 max-w-full rounded border bg-background px-2 py-1 pr-7 text-sm"
              />
              {recherche && (
                <button
                  type="button"
                  data-testid="effacer-recherche"
                  aria-label="Effacer la recherche"
                  onClick={() => { setRecherche(""); setArchiveOuverte(null); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>


            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button size="icon" variant="outline" onClick={() => setZoom(zoom - 10)} aria-label="Réduire le zoom">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-sm tabular-nums" data-testid="niveau-zoom">{zoom}%</span>
              <Button size="icon" variant="outline" onClick={() => setZoom(zoom + 10)} aria-label="Augmenter le zoom">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => void basculerPleinEcran()} aria-label="Plein écran">
                {pleinEcran ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {rechercheNorm && archivesTrouvees.length > 0 && (
            <div className="rounded border bg-muted/40 px-2 py-1 text-xs space-y-1" data-testid="resultats-archives">
              <p className="font-semibold text-muted-foreground">Archives de l'ancien circuit (lecture de l'existant, aucune migration) :</p>
              {archivesTrouvees.map((a) => (
                <div key={a.cle} className="flex flex-wrap items-center gap-1" data-testid="archive-trouvee">
                  <span className="font-semibold">{a.nom}</span><span className="text-muted-foreground">—</span>
                  <Button size="sm" variant={archiveOuverte?.cle === a.cle ? "default" : "outline"} className="h-6 px-2 text-xs"
                    onClick={() => setArchiveOuverte(a)}>{a.libelle} — ancien circuit</Button>
                </div>
              ))}
            </div>
          )}
          {candidatsTrouves && (
            <div className="rounded border bg-muted/40 px-2 py-1 text-xs space-y-1" data-testid="resultats-recherche">
              {candidatsTrouves.length === 0 ? (
                <p className="font-semibold text-muted-foreground">Aucun candidat trouvé</p>
              ) : candidatsTrouves.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-1" data-testid="candidat-trouve">
                  <span className="font-semibold">{c.nom}</span>
                  <span className="text-muted-foreground">—</span>
                  {c.examens.map((e) => (
                    <Button
                      key={e.cle}
                      size="sm"
                      variant={ebChoisi?.cle === e.cle ? "default" : "outline"}
                      className="h-6 px-2 text-xs"
                      title={e.groupeLibelle}
                      onClick={() => { if (e.groupeCle !== groupeCle) setGroupeCle(e.groupeCle); setTimeout(() => setEbCle(e.cle), 0); }}
                    >
                      {e.exam_id}{e.circuit === "ancien" ? " (ancien circuit)" : ""}{e.groupeCle !== groupeCle ? ` · ${e.groupeLibelle}` : ""}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {(ebChoisi?.dates.length ?? 0) > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap" data-testid="dates-eb">
              <span className="text-xs text-muted-foreground">Dates de passage :</span>
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                variant={jourFiltre ? "outline" : "default"}
                onClick={() => setJourFiltre(null)}
                data-testid="date-toutes"
              >
                Toutes ({ebChoisi?.attemptIds.length})
              </Button>
              {(ebChoisi?.dates ?? []).map((d) => (
                <Button
                  key={d.jour}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  variant={jourFiltre === d.jour ? "default" : "outline"}
                  onClick={() => setJourFiltre(d.jour)}
                  data-testid={`date-${d.jour}`}
                >
                  {d.date} ({d.attemptIds.length})
                </Button>
              ))}
            </div>
          )}
          {!ancienCircuit && <p className="text-xs text-muted-foreground" data-testid="compteur-session">
            {session ? <>Session affichée (tous les candidats) : {corrigees}/{total} QRC corrigées — {total - corrigees} restantes</> : "Lecture des copies…"}
            {qrcSel && (
              <span className="block font-medium text-foreground" data-testid="compteur-candidat">
                Candidat sélectionné : {corrigeesCandidat}/{totalCandidat} QRC corrigées — {totalCandidat - corrigeesCandidat} restantes
              </span>
            )}
            {nbPassagesCroises > 0 && (
              <span className="block font-medium text-warning" data-testid="compteur-inscriptions-croisees">
                Inscription croisée : {nbPassagesCroises} passage(s) aussi visibles dans l’autre session — ne pas additionner les totaux des deux sessions.
              </span>
            )}
          </p>}
          <p className="text-xs text-muted-foreground" data-testid="legende-origine">
            <span className="text-destructive font-semibold">rouge = à corriger (∅ copie vide)</span>
            {" · "}
            <span className="text-ia font-semibold">🤖 violet = corrigée par IA, non vérifiée</span>
            {" · "}
            <span className="text-success">✓ vert = correction humaine vérifiée</span>
            {" · "}
            <span className="text-warning">≈ orange = correction automatique historique</span>
            {" · "}
            <span>? gris = origine à vérifier</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="interrupteur-ia">
            <span className="font-medium">Correction IA automatique des QRC e-learning :</span>
            <span className={`rounded px-2 py-0.5 font-semibold ${configIa?.actif ? "bg-ia/15 text-ia" : "bg-muted text-muted-foreground"}`} data-testid="etat-interrupteur-ia">
              {configIa == null ? "…" : configIa.actif ? "ACTIVÉ" : "DÉSACTIVÉ"}
            </span>
            {configIa?.pause_depuis && (
              <span className="text-destructive font-semibold" data-testid="pause-ia">
                ⏸ En pause ({configIa.pause_motif === "credits_ia_epuises" ? "crédits IA épuisés" : "service IA refusé"}) — les QRC restent à corriger par le formateur
              </span>
            )}
            {configIa && (
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" data-testid="basculer-ia" onClick={() => void basculerIa()}>
                {configIa.actif ? "Désactiver" : "Activer"}
              </Button>
            )}
            {nbDemandesOuvertes > 0 && (
              <span className="text-destructive font-semibold" data-testid="compteur-verifications">⚠️ {nbDemandesOuvertes} vérification(s) demandée(s) par des élèves</span>
            )}
          </div>
          {(nbIndetermines > 0 || nbConflits > 0) && (
            <p className="text-xs text-warning" data-testid="alerte-rattachement">
              ⚠️ {nbIndetermines} candidat(s) sans session CRM déterminée · {nbConflits} candidat(s) avec des sessions CRM qui se chevauchent (aucun choix automatique).
            </p>
          )}
          {groupes.length === 0 && !erreur && (
            <p className="text-xs text-muted-foreground" data-testid="chargement-liste">Lecture des sessions et des copies en cours…</p>
          )}
          {groupes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {nouveauxPassages && <span className="text-muted-foreground" data-testid="nouveaux-passages">Nouveaux passages détectés.</span>}
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" data-testid="actualiser-liste" disabled={relectureListe} onClick={() => void actualiserListe()}>
                {relectureListe ? "Lecture de la liste…" : "Actualiser la liste des copies"}
              </Button>
            </div>
          )}
          {mode === "migre" && <PanneauRapprochement groupes={groupes} pret={!lectureCopies && session !== null} />}
        </header>

        {archiveOuverte ? (
          <div style={{ zoom: `${zoom}%` }} data-testid="archive-ouverte">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="font-semibold">Archive : {archiveOuverte.nom} — {archiveOuverte.libelle}</span>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setArchiveOuverte(null)}>Fermer l'archive</Button>
            </div>
            <CopiesHistoriquesLecture key={archiveOuverte.cle} resultIds={archiveOuverte.resultIds} />
          </div>
        ) : ancienCircuit ? (
          <div style={{ zoom: `${zoom}%` }}>
            <CopiesHistoriquesLecture resultIds={legacyResultIds ?? []} />
          </div>
        ) : <div style={{ zoom: `${zoom}%` }} className="space-y-6">
        {matieres.map((m) => {
          const tentatives = ordonnerCandidatsParFin((session?.tentatives ?? []).filter((t) =>
            (t.snapshot.matieres ?? []).some((x) => x.subject_id === m.subject_id),
          ));
          // Plusieurs dates peuvent coexister sous le même EB : on réunit les questions QRC
          // rencontrées dans les snapshots, sans jamais en inventer ni en fusionner d'un autre EB.
          const questions: typeof tentatives[number]["snapshot"]["questions"] = [];
          for (const t of tentatives) {
            for (const q of t.snapshot.questions ?? []) {
              if (q.matiere === m.subject_id && q.type === "QRC" && !questions.some((x) => x.id === q.id)) {
                questions.push(q);
              }
            }
          }
          const attemptIds = new Set(tentatives.map((t) => t.attempt_id));
          const dansMatiere = (session?.qrc ?? []).filter((q) => attemptIds.has(q.attempt_id));
          const ok = dansMatiere.filter((q) => q.etat === "corrigee").length;
          return (
            <section key={m.subject_id} className="space-y-1">
              <h2 className="text-sm font-semibold">
                {m.lettre} — {m.titre}{" "}
                <span className="text-sm text-muted-foreground">
                  {dansMatiere.length > 0 && ok === dansMatiere.length ? "✓ TERMINÉE" : `${ok}/${dansMatiere.length}`}
                </span>
              </h2>
              <div
                className="overflow-x-auto"
                ref={(el) => { tableauxRef.current.set(m.subject_id, el); }}
                onScroll={(e) => scrollsX.current.set(m.subject_id, e.currentTarget.scrollLeft)}
              >
                <table
                  className="w-full table-fixed border-collapse text-xs"
                  data-testid={`matrice-${m.subject_id}`}
                  style={{ minWidth: `${largeurMinimaleMatrice(questions.length)}rem` }}
                >
                  <colgroup>
                    <col style={{ width: `${LARGEURS_MATRICE.candidat}rem` }} />
                    <col style={{ width: `${LARGEURS_MATRICE.passage}rem` }} />
                    <col style={{ width: `${LARGEURS_MATRICE.note}rem` }} />
                    {questions.map((q) => <col key={q.id} />)}
                  </colgroup>
                  <thead>
                    <tr className="border-b">
                      <th className={`${panneauOuvert ? "" : "md:sticky md:left-0 md:z-[1]"} bg-background px-1 py-0.5 text-left`}>Candidat</th>
                      <th className="px-1 py-0.5 text-left">Passage</th>
                      <th className="px-1 py-0.5 text-left whitespace-nowrap">Note /20</th>
                      {questions.map((q, i) => <th key={q.id} className="px-0.5 py-0.5 text-center" title={`QRC ${i + 1}`}>Q{i + 1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tentatives.map((t) => (
                      <tr key={t.attempt_id}>
                        <td
                          className={`${panneauOuvert ? "" : "md:sticky md:left-0 md:z-[1]"} bg-background px-1 py-0.5 font-medium`}
                          title={`${t.candidat}${ebChoisi?.inscriptionCroiseeParAttempt?.[t.attempt_id]?.length ? ` — Inscription croisée, également visible dans ${ebChoisi.inscriptionCroiseeParAttempt[t.attempt_id].join(" et ")}` : ""}`}
                        >
                          <a
                            href={`/?section=crm&apprenant=${encodeURIComponent(String(t.apprenant_id))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-primary underline-offset-2 hover:underline"
                            title={`Ouvrir la fiche CRM de ${t.candidat} (nouvel onglet)`}
                            aria-label={`Ouvrir la fiche CRM de ${t.candidat} (nouvel onglet)`}
                            data-testid={`lien-crm-${t.attempt_id}`}
                          >
                            {t.candidat}
                          </a>
                          {ebChoisi?.inscriptionCroiseeParAttempt?.[t.attempt_id]?.length ? (
                            <span className="block text-[10px] font-semibold text-warning" data-testid={`inscription-croisee-${t.attempt_id}`}>
                              Inscription croisée
                            </span>
                          ) : null}
                        </td>
                        <td
                          className="px-1 py-0.5 whitespace-nowrap text-muted-foreground truncate"
                          title={`${t.started_at ? new Date(t.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "date inconnue"} · tentative ${t.attempt_id.slice(0, 8)}`}
                        >
                          {t.started_at
                            ? new Date(t.started_at).toLocaleString("fr-FR", {
                                timeZone: "Europe/Paris",
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "date inconnue"}
                        </td>
                        {(() => {
                          // Note /20 : résultat serveur de CETTE tentative (QCM du snapshot + dernière
                          // correction de chaque QRC). Aucun calcul local, aucune lecture de la version actuelle.
                          const res = (session?.resultats ?? []).find((r) => r.attempt_id === t.attempt_id);
                          const defin = res != null && (res.qrc_restantes ?? 0) === 0;
                          return (
                            <td
                              key="note20"
                              data-testid={`note20-${t.attempt_id}`}
                              title={res == null || res.score == null ? undefined : defin ? "Note définitive" : `Note provisoire — ${res.qrc_restantes} QRC restante(s)`}
                              className={`px-1 py-0.5 whitespace-nowrap truncate font-semibold ${
                                res == null ? "text-muted-foreground" : defin ? "text-success" : "text-warning"
                              }`}
                            >
                              {res == null || res.score == null
                                ? "—"
                                : defin
                                  ? `✓ ${String(res.score).replace(".", ",")} déf.`
                                  : `⏳ ${String(res.score).replace(".", ",")} · ${res.qrc_restantes} rest.`}
                            </td>
                          );
                        })()}
                        {questions.map((q) => {
                          const qt = t.snapshot.questions.find((x) => x.id === q.id);
                          const inst = (session?.qrc ?? []).find(
                            (x) => x.attempt_id === t.attempt_id && x.question_id === q.id,
                          );
                          // ⚪ GRIS : aucune QRC pour ce couple candidat / question.
                          if (!inst) {
                            return (
                              <td key={q.id} className="px-0.5 py-0.5 text-center">
                                <span className="block rounded border border-muted bg-muted px-1 py-0.5 text-muted-foreground">—</span>
                              </td>
                            );
                          }
                          const restaure = baremeRestaureDe.get(inst.qrc_instance_id) ?? null;
                          const points = qt?.points ?? restaure?.bareme ?? null;
                          // 🟢 corrigée par un formateur · 🟠 correction automatique historique
                          // ◻️ origine non tracée · ⚠️ barème absent · 🔴 travail restant
                          const corrigee = inst.etat === "corrigee";
                          const origine = origineCorrection(inst);
                          const probleme = !corrigee && points == null;
                          const vide = !texte(inst.reponseComplete ?? inst.reponse).trim();
                          const note = `${String(inst.note).replace(".", ",")}${points != null ? `/${points}` : ""}`;
                          const verificationDemandee = demandesOuvertes.has(inst.qrc_instance_id);
                          const style = corrigee
                            ? origine === "humaine"
                              ? "border-success bg-success/20 text-success"
                              : origine === "ia"
                                ? `border-ia bg-ia/15 text-ia${verificationDemandee ? " ring-2 ring-destructive" : ""}`
                              : origine === "automatique"
                                ? "border-warning bg-warning/20 text-warning"
                                : "border-muted-foreground/50 bg-muted text-muted-foreground"
                            : probleme
                              ? "border-warning border-dashed bg-transparent text-warning"
                              : "border-destructive bg-destructive/15 text-destructive";
                          const compact = celluleCompacte({ corrigee, origine, note: inst.note, points, vide, verificationDemandee });
                          return (
                            <td key={q.id} className="px-0.5 py-0.5">
                              <button
                                data-testid={`cellule-${inst.qrc_instance_id}`}
                                data-origine={corrigee ? origine : "aucune"}
                                data-couleur={compact.couleur}
                                title={compact.detail}
                                aria-label={compact.detail}
                                onClick={() => { setSelection(inst.qrc_instance_id); setNote(null); setEtatEnvoi("vide"); }}
                                className={`block w-full truncate rounded border-2 px-1 py-0.5 text-center font-semibold tabular-nums whitespace-nowrap ${style} ${qrcSel?.qrc_instance_id === inst.qrc_instance_id ? "ring-2 ring-primary ring-offset-1" : ""}`}
                              >
                                {compact.libelle}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        </div>}
        {erreur && <p className="text-sm text-destructive" data-testid="erreur-admin">{erreur}</p>}
      </div>

      {panneauOuvert && <div
        onMouseDown={demarrerRedim}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le panneau"
        className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-primary/40"
      />}
      {panneauOuvert && <aside
        data-testid="panneau-correction"
        className="min-w-0 shrink-0 border-l p-3 space-y-2 overflow-y-auto sticky top-0 max-h-screen"
        style={{ flex: `0 0 calc(${partPanneau}% - 3px)`, width: `calc(${partPanneau}% - 3px)` }}
      >
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSelection(null)} data-testid="fermer-panneau">
            Fermer ✕
          </Button>
        </div>
        {qrcSel && questionSel && tentativeSel && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2 border-b pb-2">
              <a
                href={`/?section=crm&apprenant=${encodeURIComponent(String(qrcSel.apprenant_id))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-2 hover:underline"
                title="Ouvrir la fiche CRM de l'élève (nouvel onglet)"
                data-testid="lien-fiche-crm"
              >
                {tentativeSel.candidat} ↗
              </a>
              <span className="text-xs text-muted-foreground">
                {ebChoisi?.exam_id} ·{" "}
                {tentativeSel.started_at
                  ? new Date(tentativeSel.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
                  : "date inconnue"}{" "}
                · tentative {tentativeSel.attempt_id.slice(0, 8)}
              </span>
              {(() => {
                const mat = (tentativeSel.snapshot.matieres ?? []).find((m) => m.subject_id === questionSel?.matiere);
                return (
                  <span className="ml-auto text-right text-sm font-semibold text-primary" data-testid="entete-eb-matiere">
                    📅 Examen blanc du {tentativeSel.started_at
                      ? new Date(tentativeSel.started_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
                      : "date inconnue"}
                    {" · "}📘 Matière : {mat ? [mat.lettre, mat.titre].filter((v) => v != null && String(v).trim() !== "").join(" — ") || (questionSel?.matiere ?? "inconnue") : (questionSel?.matiere ?? "inconnue")}
                  </span>
                );
              })()}
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  qrcSel.etat === "corrigee" && origineSel === "ia"
                    ? "bg-ia/15 text-ia"
                    : qrcSel.etat === "corrigee"
                    ? "bg-success/15 text-success"
                    : baremeSel == null
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/15 text-warning"
                }`}
                data-testid="etat-qrc"
              >
                {qrcSel.etat === "corrigee" && origineSel === "ia"
                  ? `🤖 Correction IA : ${String(qrcSel.note).replace(".", ",")}${baremeSel != null ? `/${baremeSel}` : ""}`
                  : qrcSel.etat === "corrigee"
                  ? `🔒 Correction déjà validée : ${String(qrcSel.note).replace(".", ",")}${baremeSel != null ? `/${baremeSel}` : ""}`
                  : baremeSel == null
                    ? "🔴 Correction bloquée"
                    : "🟠 À corriger"}
              </span>
            </div>

            <div className="rounded border bg-muted/40 p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question</p>
              <p className="text-sm">{questionSel.enonce}</p>
            </div>

            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Réponse de l'apprenant</p>
              <p data-testid="reponse-eleve" className="whitespace-pre-wrap text-lg leading-relaxed">
                {qrcSel.reponseComplete ? (
                  <>
                    {qrcSel.reponseComplete}
                    <span className="block mt-2 text-xs text-muted-foreground">Texte complet de la fiche élève (le nouveau moteur n'a gardé que : « {texte(qrcSel.reponse) || "vide"} »).</span>
                  </>
                ) : (texte(qrcSel.reponse) || "(copie vide)")}
              </p>
            </div>

            <div className="rounded-lg border border-success/40 bg-success/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-success">✓ Réponse officielle (snapshot)</p>
              {questionSel.reponseQRC ? (
                <p data-testid="reponse-officielle" className="whitespace-pre-wrap text-base">{questionSel.reponseQRC}</p>
              ) : (
                <p className="text-warning text-sm" data-testid="officielle-absente">⚠️ RÉPONSE OFFICIELLE HISTORIQUE ABSENTE</p>
              )}
            </div>

            {origineSel === "ia" && (
              <div className="rounded-lg border-2 border-ia/50 bg-ia/10 p-3 space-y-1 text-sm" data-testid="proposition-ia">
                {demandeOuverteSel && (
                  <p className="font-semibold text-destructive" data-testid="verification-demandee">⚠️ Vérification demandée par l'élève</p>
                )}
                <p className="font-semibold text-ia">🤖 Correction IA — Gemini 3.8 Flash (non vérifiée par un formateur)</p>
                <p>Note proposée : <strong>{String(qrcSel.note).replace(".", ",")}{baremeSel != null ? `/${baremeSel}` : ""}</strong></p>
                {iaAppliqueeSel?.justification && <p className="text-muted-foreground">Explication de l'IA : {iaAppliqueeSel.justification}</p>}
                <Button
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  data-testid="confirmer-note-ia"
                  disabled={etatEnvoi === "encours"}
                  onClick={() => void valider(qrcSel.note as number, true)}
                >
                  ✓ Confirmer la note IA (devient vérifiée humainement)
                </Button>
              </div>
            )}
            {estConsultation(qrcSel.qrc_instance_id) && (!histoSel || histoSel.score_obtenu == null || baremeSel == null) ? (
              <p className="rounded border bg-muted p-2 text-sm text-destructive" data-testid="historique-non-notable">
                🔴 Notation impossible : barème figé ou score de la copie absent. Aucune note n'est inventée.
              </p>
            ) : qrcSel.etat === "corrigee" ? (
              <div className="rounded-lg border p-3 space-y-2 text-sm" data-testid="correction-verrouillee">
                <p className={`font-semibold ${origineSel === "ia" ? "text-ia" : "text-success"}`} data-testid="points-attribues">
                  NOTE : {String(qrcSel.note).replace(".", ",")}
                  {baremeSel != null ? ` / ${baremeSel}` : " (barème historique absent)"}
                </p>
                {navigationCopies}
                {!modeRevision && origineSel !== "ia" ? (
                  <>
                    <Button variant="outline" size="sm" data-testid="modifier-note" disabled={!historiqueCharge} onClick={() => setModeRevision(true)}>
                      ✏️ Modifier la note
                    </Button>
                    <div className="space-y-2" data-testid="commentaire-seul">
                      <Textarea
                        placeholder="Commentaire pour l’élève (la note ne change pas)"
                        rows={2}
                        value={commentaireCourant}
                        disabled={etatEnvoi === "encours" || !historiqueCharge}
                        onChange={(e) => modifierCommentaire(e.target.value)}
                      />
                      <CommentairesPredefinis disabled={etatEnvoi === "encours" || !historiqueCharge} onAjouter={ajouterCommentaire} />
                      <Button size="sm" data-testid="enregistrer-commentaire"
                        disabled={etatEnvoi === "encours" || !historiqueCharge || !commentaireModifie || commentaireCourant === commentaireSauve}
                        onClick={() => void enregistrerCommentaireSeul()}>
                        Enregistrer le commentaire
                      </Button>
                    </div>
                  </>
                ) : baremeSel == null ? (
                  <p className="text-xs text-muted-foreground">
                    Barème historique absent : la note ne peut pas être révisée tant que le barème n'est pas défini.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: Math.round(baremeSel / 0.5) + 1 }, (_, i) => i * 0.5).map((v) => (
                        <Button
                          key={v}
                          size="lg"
                          className="min-w-[56px] text-base font-semibold"
                          variant={qrcSel.note === v ? "default" : "outline"}
                          title={origineSel === "ia" && qrcSel.note === v ? "Note proposée par l'IA — cliquer pour la valider" : undefined}
                          data-testid={`revision-note-${v}`}
                          disabled={etatEnvoi === "encours"}
                          onClick={() => void valider(v)}
                        >
                          {String(v).replace(".", ",")}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Motif de la révision (facultatif)"
                      rows={2}
                      value={commentaireCourant}
                      disabled={etatEnvoi === "encours"}
                      onChange={(e) => modifierCommentaire(e.target.value)}
                    />
                    <CommentairesPredefinis disabled={etatEnvoi === "encours"} onAjouter={ajouterCommentaire} />
                    {origineSel === "ia" ? (
                      <p className="text-xs text-ia" data-testid="aide-note-ia">🤖 Note surlignée = proposition IA non vérifiée. Un clic sur une note l’enregistre immédiatement comme correction humaine vérifiée.</p>
                    ) : (
                      <Button variant="ghost" size="sm" data-testid="annuler-revision" onClick={() => setModeRevision(false)}>Annuler</Button>
                    )}
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  Une révision crée une nouvelle correction tracée : l'ancienne note reste dans l'historique.
                </p>
                <div className="text-sm" data-testid="etat-revision">
                  {etatEnvoi === "encours" && <span className="text-warning">🟠 Enregistrement…</span>}
                  {etatEnvoi === "ok" && <span className="text-success">🟢 Correction enregistrée</span>}
                  {etatEnvoi === "echec" && <span className="text-destructive">🔴 NON ENREGISTRÉE</span>}
                </div>
              </div>
            ) : baremeSel == null ? (
              <p className="rounded border bg-muted p-2 text-sm text-muted-foreground" data-testid="bareme-absent">
                🔴 BARÈME HISTORIQUE INTROUVABLE — CORRECTION BLOQUÉE. Le barème doit être défini manuellement ; il n'est
                jamais repris de la version actuelle de l'examen.
              </p>
            ) : (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notation — barème : {baremeSel} points
                </p>
                {navigationCopies}
                {videSel && (
                  <p className="text-xs text-muted-foreground" data-testid="copie-vide-en-attente">
                    Copie vide — aucune correction historique, aucune note automatique.
                  </p>
                )}
                {proposition.autoValidable && proposition.note != null
                  ? <p className="text-xs text-success" data-testid="validation-auto">Réponse littéralement identique au corrigé : note maximale validée automatiquement.</p>
                  : proposition.note != null
                    ? <p className="text-xs text-muted-foreground" data-testid="preselection-qrc">Présélection proposée ({proposition.motif}) — cliquez sur une note pour l'enregistrer immédiatement.</p>
                    : <p className="text-xs text-muted-foreground">Aucune note automatique : cliquez sur la note, elle est enregistrée immédiatement.</p>}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.round((baremeSel ?? 0) / 0.5) + 1 }, (_, i) => i * 0.5).map((v) => (
                    <Button
                      key={v}
                      size="lg"
                      className="min-w-[56px] text-base font-semibold"
                      variant={noteChoisie === v ? "default" : "outline"}
                      aria-pressed={noteChoisie === v}
                      data-testid={`note-${v}`}
                      disabled={etatEnvoi === "encours"}
                      onClick={() => { setChoixLocal({ cle: cleProposition, note: v }); void valider(v); }}
                    >
                      {String(v).replace(".", ",")}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Commentaire (facultatif)"
                  rows={2}
                  value={commentaireCourant}
                  disabled={etatEnvoi === "encours"}
                  onChange={(e) => modifierCommentaire(e.target.value)}
                />
                <CommentairesPredefinis disabled={etatEnvoi === "encours"} onAjouter={ajouterCommentaire} />
                <div className="text-sm" data-testid="etat-correction">
                  {etatEnvoi === "encours" && <span className="text-warning">🟠 Enregistrement de la correction…</span>}
                  {etatEnvoi === "ok" && <span className="text-success">🟢 Correction enregistrée</span>}
                  {etatEnvoi === "echec" && <span className="text-destructive">🔴 CORRECTION NON ENREGISTRÉE</span>}
                </div>
              </div>
            )}

            {messageNavigation && (
              <p role="status" className="rounded border border-success/40 bg-success/10 p-2 text-sm font-semibold text-success" data-testid="fin-liste-copies">
                {messageNavigation}
              </p>
            )}
            {historiqueCharge && commentaireSauve && (
              <p className="whitespace-pre-wrap text-sm" data-testid="commentaire-enregistre">{commentaireSauve}</p>
            )}
            {etatEnvoi === "echec" && erreur && (
              <p role="alert" className="rounded border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive" data-testid="erreur-correction-copie">
                {erreur}
              </p>
            )}

            <div className="space-y-1 border-t pt-2 text-[11px] text-muted-foreground">
              {histoSel && (
                <p data-testid="provenance-remise">
                  Copie originale {histoSel.result_id} · question {qrcSel.question_id} ·{" "}
                  {histoSel.provenance === "resultat_seul"
                    ? "remise non retrouvée : confirmation demandée"
                    : histoSel.provenance === "remise_identique"
                      ? "remise vérifiée automatiquement (identique)"
                      : "remise vérifiée automatiquement (réponses identiques, horodatage différent)"}
                </p>
              )}
              {iaSel.length > 0 && (
                <div data-testid="historique-ia">
                  <p className="font-medium text-ia">Historique IA (conservé)</p>
                  {iaSel.map((c, i) => (
                    <p key={i}>
                      🤖 {c.statut === "appliquee" ? `${String(c.note).replace(".", ",")}/${c.bareme}` : (LIBELLES_MOTIF_IA[c.motif ?? ""] ?? c.motif ?? c.statut)}
                      {" — "}{new Date(c.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
                    </p>
                  ))}
                </div>
              )}
              {demandesSel.filter((d) => d.statut === "traitee").map((d) => (
                <p key={d.id} data-testid="verification-traitee">
                  Vérification élève traitée : IA {String(d.note_ia).replace(".", ",")} → {String(d.note_finale).replace(".", ",")}
                  {d.traitee_email ? ` par ${d.traitee_email}` : ""}
                  {d.traitee_at ? ` · ${new Date(d.traitee_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}
                </p>
              ))}
              {historique.length > 0 && (
                <div data-testid="historique-corrections">
                  <p className="font-medium">Historique des corrections</p>
                  {historique.map((h, i) => (
                    <p key={i}>
                      {h.note_precedente == null
                        ? `${String(h.note_nouvelle).replace(".", ",")}`
                        : `${String(h.note_precedente).replace(".", ",")} → ${String(h.note_nouvelle).replace(".", ",")}`}
                      {" — "}
                      {new Date(h.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
                      {h.corrige_email ? ` par ${h.corrige_email}` : " par correcteur non renseigné"}
                    </p>
                  ))}
                </div>
              )}
              {qrcSel.corrige_email?.startsWith("Correction historique") && (
                <p data-testid="origine-correction">
                  {qrcSel.corrige_email}
                  {qrcSel.corrige_at ? ` · ${new Date(qrcSel.corrige_at).toLocaleString("fr-FR")}` : " · date historique inconnue"}
                </p>
              )}
              {qrcSel.etat === "corrigee" && !texte(qrcSel.reponse) && (
                <p className="text-warning" data-testid="points-sans-reponse">
                  ⚠️ Correction historique avec points mais sans réponse enregistrée — contrôle manuel requis
                </p>
              )}
              {restaureSel && (
                <p data-testid="bareme-restaure">
                  {restaureSel.mention} — barème {restaureSel.bareme} points, {restaureSel.nb_preuves} passage(s) de preuve
                </p>
              )}
              {groupeChoisi && (
                <p className={estEnCours(groupeChoisi) ? "text-red-600 font-semibold" : undefined}>
                  {estEnCours(groupeChoisi) ? "🔴 EN COURS — " : ""}
                  {groupeChoisi.libelle}
                  {groupeChoisi.periode ? ` (${groupeChoisi.periode})` : ""}
                </p>
              )}
            </div>

            {(() => {
              const res = session?.resultats.find((r) => r.attempt_id === qrcSel.attempt_id);
              if (!res) return null;
              return (
                <p className="text-xs text-muted-foreground" data-testid="resultat-admin">
                  {res.status === "definitif"
                    ? `Résultat DÉFINITIF ${res.score}/20`
                    : `🟠 RÉSULTAT PROVISOIRE — ${res.qrc_restantes} QRC restantes`}{" "}
                  · result_id <span data-testid="admin-result-id">{res.result_id}</span> · révision{" "}
                  <span data-testid="admin-result-revision">{res.result_revision}</span>
                </p>
              );
            })()}
          </>
        )}
      </aside>}
    </div>
  );
}
