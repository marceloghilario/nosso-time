import type { Championship, ChampionshipGame } from '../../types';

export interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

const buildRow = (teamId: string, teamName: string): StandingRow => ({
  teamId,
  teamName,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  gf: 0,
  ga: 0,
  gd: 0,
  points: 0,
});

const applyGame = (row: StandingRow, gf: number, ga: number): void => {
  row.played += 1;
  row.gf += gf;
  row.ga += ga;
  row.gd = row.gf - row.ga;
  if (gf > ga) {
    row.wins += 1;
    row.points += 3;
  } else if (gf < ga) {
    row.losses += 1;
  } else {
    row.draws += 1;
    row.points += 1;
  }
};

export const computeStandings = (
  championship: Championship,
  filter: (g: ChampionshipGame) => boolean,
  teamIds: string[],
): StandingRow[] => {
  const rows = new Map<string, StandingRow>();
  for (const id of teamIds) {
    const participant = championship.participants.find((p) => p.teamId === id);
    rows.set(id, buildRow(id, participant?.teamName ?? ''));
  }
  for (const g of championship.games) {
    if (!filter(g)) continue;
    if (g.status !== 'REALIZADO') continue;
    if (g.homeScore === undefined || g.awayScore === undefined) continue;
    const home = g.homeTeamId ? rows.get(g.homeTeamId) : undefined;
    const away = g.awayTeamId ? rows.get(g.awayTeamId) : undefined;
    if (home) applyGame(home, g.homeScore, g.awayScore);
    if (away) applyGame(away, g.awayScore, g.homeScore);
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.teamName.localeCompare(b.teamName),
  );
};
