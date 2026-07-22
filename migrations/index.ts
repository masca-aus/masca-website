import * as migration_20260722_082958_initial from './20260722_082958_initial';

export const migrations = [
  {
    up: migration_20260722_082958_initial.up,
    down: migration_20260722_082958_initial.down,
    name: '20260722_082958_initial'
  },
];
