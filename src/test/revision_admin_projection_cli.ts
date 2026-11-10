// Projection admin réelle (projeterRevisionsAdmin) appliquée aux lignes relues par le harnais local.
import { projeterRevisionsAdmin } from "../features/correction-qrc-v2/revisionsAdmin";

const entree = JSON.parse(await Bun.stdin.text());
console.log(JSON.stringify(projeterRevisionsAdmin(entree.apprenant, entree.revisions, entree.sources, entree.events)));
