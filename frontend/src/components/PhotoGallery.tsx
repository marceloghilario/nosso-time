import { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { Media } from '../types';

interface Props {
  media: Media[];
}

export default function PhotoGallery({ media }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (media.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ImageIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600">Nenhuma foto enviada ainda.</p>
      </div>
    );
  }

  const items = media.filter((m) => m.type === 'PHOTO' && !!m.url);
  const open = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((m, idx) => (
          <button
            key={m.mediaId}
            type="button"
            onClick={() => setOpenIndex(idx)}
            className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-primary-500 transition"
          >
            <img
              src={m.url}
              alt={m.caption ?? 'Foto do time'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {open && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Fechar"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={open.url}
            alt={open.caption ?? 'Foto do time'}
            className="max-h-full max-w-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
