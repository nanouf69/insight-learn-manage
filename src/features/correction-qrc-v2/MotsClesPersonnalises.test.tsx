import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotsClesPersonnalises } from "./MotsClesPersonnalises";
import { ajouterCommentaireQrc } from "./commentairesPredefinis";

const serveur = vi.hoisted(() => ({ lignes: [] as {id:string;texte:string;version:number;archive:boolean}[], sauver: vi.fn() }));
vi.mock("./motsClesPersonnalises", () => ({
  MOTS_CLES_QUERY: ["test-mots"], lireMotsClesQrc: async () => serveur.lignes.filter(m => !m.archive),
  enregistrerMotCleQrc: serveur.sauver,
}));
beforeEach(() => {
  serveur.lignes = [];
  serveur.sauver.mockReset().mockImplementation(async (m) => {
    const ligne = { ...m, version: (m.version ?? 0) + 1, archive: m.archive ?? false };
    serveur.lignes = [...serveur.lignes.filter(x => x.id !== m.id), ligne]; return ligne;
  });
});
const monter = (ajouter: (texte: string) => void = vi.fn()) => render(<QueryClientProvider client={new QueryClient()}><MotsClesPersonnalises disabled={false} onAjouter={ajouter} /></QueryClientProvider>);

describe("Catalogue partagé sans écriture pédagogique", () => {
  it("crée, relit après remontage, cumule sans doublon et conserve le texte libre", async () => {
    let commentaire = "Réponse initiale";
    const ajouter = vi.fn((t:string) => { commentaire = ajouterCommentaireQrc(commentaire, t); });
    const vue = monter(ajouter);
    fireEvent.click(await screen.findByRole("button", { name: "Ajouter un mot-clé" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Texte du mot-clé" }), { target: { value: "Mon retour personnel" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("button", { name: "Mon retour personnel" });
    vue.unmount(); monter(ajouter);
    const bouton = await screen.findByRole("button", { name: "Mon retour personnel" });
    fireEvent.click(bouton); fireEvent.click(bouton);
    expect(commentaire).toBe("Réponse initiale\nMon retour personnel");
    expect(serveur.sauver).toHaveBeenCalledTimes(1);
  });
  it("renomme uniquement après confirmation et archive sans modifier le commentaire déjà copié", async () => {
    serveur.lignes = [{ id:"a", texte:"Ancien texte", version:1, archive:false }];
    let commentaire = "";
    monter(t => { commentaire = ajouterCommentaireQrc(commentaire, t); });
    fireEvent.click(await screen.findByRole("button", { name:"Ancien texte" }));
    fireEvent.click(screen.getByRole("button", { name:"Modifier : Ancien texte" }));
    fireEvent.change(screen.getByRole("textbox"), { target:{ value:"Texte renommé" } });
    fireEvent.click(screen.getByRole("button", { name:"Enregistrer" }));
    expect(serveur.sauver).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name:"Confirmer la modification" }));
    await screen.findByRole("button", { name:"Texte renommé" });
    fireEvent.click(screen.getByRole("button", { name:"Supprimer : Texte renommé" }));
    fireEvent.click(screen.getByRole("button", { name:"Annuler" }));
    expect(serveur.sauver).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name:"Supprimer : Texte renommé" }));
    fireEvent.click(screen.getByRole("button", { name:"Supprimer de la liste" }));
    await waitFor(() => expect(serveur.lignes[0].archive).toBe(true));
    expect(commentaire).toBe("Ancien texte");
  });
  it("affiche un refus serveur sans fermer la saisie", async () => {
    serveur.sauver.mockRejectedValue(new Error("Conflit administrateur"));
    monter(); fireEvent.click(await screen.findByRole("button", { name:"Ajouter un mot-clé" }));
    fireEvent.change(screen.getByRole("textbox"), { target:{ value:"Conserver ce brouillon" } });
    fireEvent.click(screen.getByRole("button", { name:"Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Conflit administrateur");
    expect(screen.getByRole("textbox")).toHaveValue("Conserver ce brouillon");
  });
});