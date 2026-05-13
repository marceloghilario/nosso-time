import { Check, Pencil, Trash2 } from 'lucide-react';
import type { Formation } from '../../types';

interface Props {
  formations: Formation[];
  currentId: string | null;
  onLoad: (formation: Formation) => void;
  onRename: (formation: Formation) => void;
  onDelete: (formation: Formation) => void;
}

export default function FormationList({
  formations,
  currentId,
  onLoad,
  onRename,
  onDelete,
}: Props) {
  if (formations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        Nenhuma formação salva ainda. Use "Salvar Formação" para começar.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {formations.map((f) => {
        const isCurrent = f.formationId === currentId;
        return (
          <li
            key={f.formationId}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
              isCurrent
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => onLoad(f)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 truncate">
                {f.name}
                {f.isActive && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    <Check className="h-3 w-3" />
                    Ativa
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                {f.scheme} · {f.playerPositions.length} jogadores
              </p>
            </button>
            <button
              type="button"
              onClick={() => onRename(f)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Renomear"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(f)}
              className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
