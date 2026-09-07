import * as migration_20260802_071222_restructure_committee from './20260802_071222_restructure_committee';
import * as migration_20260907_142655_add_committee_departments from './20260907_142655_add_committee_departments';

export const migrations = [
  {
    up: migration_20260802_071222_restructure_committee.up,
    down: migration_20260802_071222_restructure_committee.down,
    name: '20260802_071222_restructure_committee',
  },
  {
    up: migration_20260907_142655_add_committee_departments.up,
    down: migration_20260907_142655_add_committee_departments.down,
    name: '20260907_142655_add_committee_departments'
  },
];
