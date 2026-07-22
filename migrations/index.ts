import * as migration_20260722_082958_initial from './20260722_082958_initial';
import * as migration_20260722_093931_add_media from './20260722_093931_add_media';

export const migrations = [
  {
    up: migration_20260722_082958_initial.up,
    down: migration_20260722_082958_initial.down,
    name: '20260722_082958_initial',
  },
  {
    up: migration_20260722_093931_add_media.up,
    down: migration_20260722_093931_add_media.down,
    name: '20260722_093931_add_media'
  },
];
