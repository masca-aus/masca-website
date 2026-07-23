import * as migration_20260722_082958_initial from './20260722_082958_initial';
import * as migration_20260722_093931_add_media from './20260722_093931_add_media';
import * as migration_20260722_095429_add_committee from './20260722_095429_add_committee';
import * as migration_20260722_100506_add_sponsors from './20260722_100506_add_sponsors';
import * as migration_20260723_013827 from './20260723_013827';

export const migrations = [
  {
    up: migration_20260722_082958_initial.up,
    down: migration_20260722_082958_initial.down,
    name: '20260722_082958_initial',
  },
  {
    up: migration_20260722_093931_add_media.up,
    down: migration_20260722_093931_add_media.down,
    name: '20260722_093931_add_media',
  },
  {
    up: migration_20260722_095429_add_committee.up,
    down: migration_20260722_095429_add_committee.down,
    name: '20260722_095429_add_committee',
  },
  {
    up: migration_20260722_100506_add_sponsors.up,
    down: migration_20260722_100506_add_sponsors.down,
    name: '20260722_100506_add_sponsors',
  },
  {
    up: migration_20260723_013827.up,
    down: migration_20260723_013827.down,
    name: '20260723_013827'
  },
];
