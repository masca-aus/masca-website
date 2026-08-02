import * as migration_20260802_071222_restructure_committee from './20260802_071222_restructure_committee';

export const migrations = [
  {
    up: migration_20260802_071222_restructure_committee.up,
    down: migration_20260802_071222_restructure_committee.down,
    name: '20260802_071222_restructure_committee'
  },
];
