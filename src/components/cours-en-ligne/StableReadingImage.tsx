/** Fixed reading frame, independent of Safari's address bar and image loading. */
export default function StableReadingImage({ src, alt, zoom, onError }: {
  src: string; alt: string; zoom: number; onError: () => void;
}) {
  return <div className="w-full overflow-auto border rounded bg-muted touch-pan-x touch-pan-y" style={{ aspectRatio: '3 / 4' }}>
    <div style={{ width: `${zoom * 100}%`, aspectRatio: '3 / 4' }}>
      <img src={src} alt={alt} draggable={false} onError={onError} className="block w-full h-full object-contain" />
    </div>
  </div>;
}