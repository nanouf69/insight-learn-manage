import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import SlideViewer from '@/components/cours-en-ligne/slides/SlideViewer';
afterEach(cleanup);
it('diagonal, vertical, pinch and cancelled gestures do not navigate; buttons do', () => {
  render(<SlideViewer titre="TEST" onBack={()=>{}} slides={[
    {type:'title',title:'FIRST'}, {type:'title',title:'SECOND'}
  ]} />);
  const title=screen.getByText('FIRST');
  for(const touches of [[{clientX:200,clientY:100}], [{clientX:200,clientY:100},{clientX:250,clientY:100}]]) {
    fireEvent.touchStart(title,{touches,changedTouches:touches});
    fireEvent.touchEnd(title,{changedTouches:[{clientX:90,clientY:600}]});
    fireEvent.touchCancel(title);
    expect(screen.getByText('FIRST')).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button',{name:/Suivant/}));
  expect(screen.getByText('SECOND')).toBeInTheDocument();
});