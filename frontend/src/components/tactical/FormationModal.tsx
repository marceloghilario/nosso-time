import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  initialName?: string;
  initialActive?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; isActive: boolean }) => void;
}

export default function FormationModal(props: Props) {
  if (!props.open) return null;
  return (
    <FormationModalBody
      key={`${props.title}|${props.initialName ?? ''}|${
        props.initialActive ? '1' : '0'
      }`}
      {...props}
    />
  );
}

function FormationModalBody({
  title,
  initialName = '',
  initialActive = false,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [isActive, setIsActive] = useState(initialActive);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, isActive });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Nome da formação *
            </span>
            <input
              type="text"
              required
              maxLength={100}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Formação titular"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Marcar como formação ativa
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
