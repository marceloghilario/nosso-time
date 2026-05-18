import { useMemo } from 'react';
import type { Championship } from '../../types';
import { computeStandings, type StandingRow } from './standings';

interface Props {
  championship: Championship;
}

const Table = ({
  title,
  rows,
  highlightTop,
}: {
  title?: string;
  rows: StandingRow[];
  highlightTop?: number;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    {title && (
      <h3 className="text-sm font-semibold text-gray-900 px-4 py-2 border-b border-gray-100">
        {title}
      </h3>
    )}
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Time</th>
            <th className="px-2 py-2 text-center font-medium">P</th>
            <th className="px-2 py-2 text-center font-medium">J</th>
            <th className="px-2 py-2 text-center font-medium">V</th>
            <th className="px-2 py-2 text-center font-medium">E</th>
            <th className="px-2 py-2 text-center font-medium">D</th>
            <th className="px-2 py-2 text-center font-medium">GP</th>
            <th className="px-2 py-2 text-center font-medium">GC</th>
            <th className="px-2 py-2 text-center font-medium">SG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.teamId}
              className={
                highlightTop && idx < highlightTop
                  ? 'bg-emerald-50/40'
                  : idx % 2
                  ? 'bg-gray-50/30'
                  : ''
              }
            >
              <td className="px-3 py-2 text-gray-500 font-medium">{idx + 1}</td>
              <td className="px-3 py-2 text-gray-900 font-medium">
                {row.teamName}
              </td>
              <td className="px-2 py-2 text-center font-bold text-gray-900">
                {row.points}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">
                {row.played}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">
                {row.wins}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">
                {row.draws}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">
                {row.losses}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">{row.gf}</td>
              <td className="px-2 py-2 text-center text-gray-700">{row.ga}</td>
              <td className="px-2 py-2 text-center text-gray-700">{row.gd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function StandingsTable({ championship }: Props) {
  const standings = useMemo(() => {
    if (championship.format === 'PONTOS_CORRIDOS') {
      return [
        {
          title: undefined,
          rows: computeStandings(
            championship,
            (g) => g.phase === 'RR',
            championship.participants.map((p) => p.teamId),
          ),
          highlightTop: 0,
        },
      ];
    }
    if (championship.format === 'COPA' && championship.groups) {
      return championship.groups.map((group) => ({
        title: group.name,
        rows: computeStandings(
          championship,
          (g) => g.phase === 'GROUP' && g.group === group.name,
          group.teamIds,
        ),
        highlightTop: 2,
      }));
    }
    return [];
  }, [championship]);

  if (standings.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sem classificação disponível para este formato.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {standings.map((s, idx) => (
        <Table
          key={idx}
          title={s.title}
          rows={s.rows}
          highlightTop={s.highlightTop}
        />
      ))}
      {championship.format === 'COPA' && (
        <p className="text-xs text-gray-500">
          {championship.groups && championship.groups.length === 1
            ? 'Os 2 primeiros avançam à Final.'
            : 'Os 2 primeiros de cada grupo avançam ao mata-mata.'}
        </p>
      )}
    </div>
  );
}
