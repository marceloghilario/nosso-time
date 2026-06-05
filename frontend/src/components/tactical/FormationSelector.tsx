import { SCHEMES_BY_MODALITY } from '../../types';
import type { FormationScheme, Modality } from '../../types';

interface Props {
  value: FormationScheme;
  onChange: (scheme: FormationScheme) => void;
  disabled?: boolean;
  modality?: Modality;
}

export default function FormationSelector({ value, onChange, disabled, modality = 'FUTEBOL' }: Props) {
  const schemes = SCHEMES_BY_MODALITY[modality];
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-700">Esquema</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormationScheme)}
        disabled={disabled}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
      >
        {schemes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
