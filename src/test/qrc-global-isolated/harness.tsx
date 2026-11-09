// Test-only entry, never referenced by application routes.
import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminCorrectionQrcV2Reel from '@/pages/AdminCorrectionQrcV2Reel';
import '@/index.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<AdminCorrectionQrcV2Reel />);
