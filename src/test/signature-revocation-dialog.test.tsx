import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {SignatureRevocationDialog} from '@/components/documents/SignatureRevocationDialog';
it('aucune annulation réelle après confirmation sans circuit serveur',()=>{
 const close=vi.fn();render(<SignatureRevocationDialog cible={{documentId:'fictif',documentNom:'Document fictif',zoneId:'z1',zoneNom:'Apprenant',signataireNom:'Candidat fictif',signedAt:'2026-11-12T21:40:10Z',image:'data:image/png;base64,AA=='}} onClose={close}/>);
 fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Confirmer l’annulation'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Conserver la signature'}));expect(close).toHaveBeenCalledTimes(1);
});