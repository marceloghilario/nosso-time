import type { FormationScheme, Modality } from '../../types';
import { SCHEMES_BY_MODALITY } from '../../types';

interface FormationSelectorProps {
  modality: Modality;
  value: FormationScheme;
  onChange: (scheme: FormationScheme) => void;
}

export default function FormationSelector({ modality, value, onChange }: FormationSelectorProps) {
  const schemes = SCHEMES_BY_MODALITY[modality];

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">Esquema tático</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormationScheme)}
        className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
