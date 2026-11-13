import { traiterRegularisation } from './regularisation.ts';

for (const action of ['liste', 'signature', '']) {
  Deno.test(`ancien lien ${action || 'sans action'} refuse sans accès aux données`, async () => {
    let accesses = 0;
    const client = new Proxy({}, { get() { accesses++; throw new Error('No data access permitted'); } });
    const response = await traiterRegularisation(client, 'owner', {
      action, regularisation_id: 'existing-grant', date_emargement: '2026-11-10',
      signature_data_url: 'existing-image', confirme_presence_creneau: true,
    });
    if (response.status !== 403 || accesses !== 0) throw new Error('Retired route not closed');
    const data = await response.json();
    if (data.code !== 'P0541') throw new Error('Missing refusal code');
  });
}