import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EntrainementSansExamenAlerte } from '@/components/examens/EntrainementSansExamenAlerte';
import '@/index.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<QueryClientProvider client={new QueryClient()}><EntrainementSansExamenAlerte /></QueryClientProvider>);