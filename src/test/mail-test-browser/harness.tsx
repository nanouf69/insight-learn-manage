import React from 'react';
import { createRoot } from 'react-dom/client';
import { MailTestPratiqueDialog } from '@/components/examens/MailTestPratiqueDialog';
import '@/index.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<main className="p-6 bg-background text-foreground"><MailTestPratiqueDialog type="vtc" /></main>);