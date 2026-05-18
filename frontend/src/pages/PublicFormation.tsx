import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Share2, Trophy } from 'lucide-react';
import { DndContext } from '@dnd-kit/core';
import { api } from '../services/api';
import type { PublicFormationView } from '../types';
import { TacticalBoard } from '../components/tactical/TacticalBoard';
import PlayerMarker from '../components/tactical/PlayerMarker';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PublicFormationPage() {
  const { shareToken = '' } = useParams<{ shareToken: string }>();
  const [data, setData] = useState<PublicFormationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const view = await api.getPublicFormation(shareToken);
        if (!cancelled) setData(view);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const positions = useMemo(() => data?.playerPositions ?? [], [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Trophy className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-bold text-gray-900">Nosso Time</h1>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Formação compartilhada
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">
        {loading && <LoadingSpinner label="Carregando formação..." />}
        {error && !loading && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {data && !loading && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{data.teamName}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {data.name} · esquema {data.scheme}
              </p>
            </div>
            <DndContext>
              <TacticalBoard
                ref={fieldRef}
                droppableId="public-field"
                teamName={data.teamName}
                formationName={data.name}
                scheme={data.scheme}
              >
                {positions.map((p) => (
                  <PlayerMarker
                    key={p.playerId}
                    position={p}
                    interactive={false}
                  />
                ))}
              </TacticalBoard>
            </DndContext>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Link copiado!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Copiar link
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
