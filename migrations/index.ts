import * as migration_20260802_071222_restructure_committee from './20260802_071222_restructure_committee';
import * as migration_20260907_142655_add_committee_departments from './20260907_142655_add_committee_departments';
import * as migration_20260916_010000_add_events_submission_workflow from './20260916_010000_add_events_submission_workflow';
import * as migration_20260917_010000_add_media_admin_previews from './20260917_010000_add_media_admin_previews';
import * as migration_20260917_104410_organisations_event_locations from './20260917_104410_organisations_event_locations';
import * as migration_20260917_114229_event_lifecycle from './20260917_114229_event_lifecycle';
import * as migration_20260917_121119_committee_history from './20260917_121119_committee_history';

export const migrations = [
  {
    up: migration_20260802_071222_restructure_committee.up,
    down: migration_20260802_071222_restructure_committee.down,
    name: '20260802_071222_restructure_committee',
  },
  {
    up: migration_20260907_142655_add_committee_departments.up,
    down: migration_20260907_142655_add_committee_departments.down,
    name: '20260907_142655_add_committee_departments',
  },
  {
    up: migration_20260916_010000_add_events_submission_workflow.up,
    down: migration_20260916_010000_add_events_submission_workflow.down,
    name: '20260916_010000_add_events_submission_workflow',
  },
  {
    up: migration_20260917_010000_add_media_admin_previews.up,
    down: migration_20260917_010000_add_media_admin_previews.down,
    name: '20260917_010000_add_media_admin_previews',
  },
  {
    up: migration_20260917_104410_organisations_event_locations.up,
    down: migration_20260917_104410_organisations_event_locations.down,
    name: '20260917_104410_organisations_event_locations',
  },
  {
    up: migration_20260917_114229_event_lifecycle.up,
    down: migration_20260917_114229_event_lifecycle.down,
    name: '20260917_114229_event_lifecycle',
  },
  {
    up: migration_20260917_121119_committee_history.up,
    down: migration_20260917_121119_committee_history.down,
    name: '20260917_121119_committee_history'
  },
];
