import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const load = vi.hoisted(() => ({ callback: null as null | ((pdf: any) => void) }));
vi.mock('@/lib/pdfWorker', () => ({ ensurePdfWorker() {} }));
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }: any) => {
    load.callback = onLoadSuccess;
    React.useEffect(() => { onLoadSuccess({ numPages: 3, getPage: async () => ({ getViewport: () => ({ width: 960, height: 540 }) }) }); }, []);
    return <div>{children}</div>;
  },
  Page: ({ pageNumber, width }: any) => <div data-testid="slide" data-page={pageNumber} data-width={width} />,
}));
import PdfSlideViewer from '@/components/cours-en-ligne/PdfSlideViewer';
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ headers: new Headers() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe.each(['TAXI module6', 'TA module6', 'VTC module8', 'VA module8', 'CAS module12'])('%s shared mobile PDF', track => {
  it('vertical/diagonal/pinch gestures never turn pages; explicit navigation does', async () => {
    render(<PdfSlideViewer url="/test.pdf" nom={track} />);
    await waitFor(() => expect(screen.getByTestId('slide').dataset.page).toBe('1'));
    const slide = screen.getByTestId('slide');
    fireEvent.touchStart(slide, { changedTouches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(slide, { changedTouches: [{ clientX: 90, clientY: 600 }] });
    expect(slide.dataset.page).toBe('1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Page suivante' })[0]);
    expect(screen.getByTestId('slide').dataset.page).toBe('2');
  });
  it('same-source reload preserves page, changed source resets it', async () => {
    const r = render(<PdfSlideViewer url="/test.pdf" nom={track} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Page suivante' })[0]);
    load.callback?.({ numPages: 3, getPage: async () => ({ getViewport: () => ({ width: 960, height: 540 }) }) });
    await waitFor(() => expect(screen.getByTestId('slide').dataset.page).toBe('2'));
    r.rerender(<PdfSlideViewer url="/other.pdf" nom={track} />);
    await waitFor(() => expect(screen.getByTestId('slide').dataset.page).toBe('1'));
  });
});