import type { Matiere } from '@/components/cours-en-ligne/examens-blancs-data';
export function composeSubjectPanel<T extends {matiere_id:string}>(subjects: Matiere[],results:T[]) {
 return subjects.map(subject=>({subject,result:results.find(row=>row.matiere_id===subject.id)??null}));
}
