// Projection admin réelle (projeterRevisionsAdmin) appliquée aux lignes relues par le harnais local.
import { readFileSync } from "node:fs";
import { projeterRevisionsAdmin } from "../features/correction-qrc-v2/revisionsAdmin.ts";

const entree = JSON.parse(readFileSync(0, "utf8"));
console.log(JSON.stringify(projeterRevisionsAdmin(entree.apprenant, entree.revisions, entree.sources, entree.events)));
