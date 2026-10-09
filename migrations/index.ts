import * as listingChanges from './20261008_140000_listing_changes';
import * as listingEmails from './20261008_130000_listing_emails';
import * as listingReview from './20261001_160000_listing_review';
import * as publicSubmissions from './20261001_120000_public_submissions';
import * as workspaceAccess from "./20260930_221300_workspace_access";
import * as migration_20260802_071222_restructure_committee from './20260802_071222_restructure_committee';
import * as migration_20260907_142655_add_committee_departments from './20260907_142655_add_committee_departments';
import * as migration_20260916_010000_add_events_submission_workflow from './20260916_010000_add_events_submission_workflow';
import * as migration_20260917_010000_add_media_admin_previews from './20260917_010000_add_media_admin_previews';
import * as migration_20260917_104410_organisations_event_locations from './20260917_104410_organisations_event_locations';
import * as migration_20260917_114229_event_lifecycle from './20260917_114229_event_lifecycle';
import * as migration_20260917_121119_committee_history from './20260917_121119_committee_history';
import * as migration_20260917_124307_careers_cms from './20260917_124307_careers_cms';

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
    name: '20260917_121119_committee_history',
  },
  {
    up: migration_20260917_124307_careers_cms.up,
    down: migration_20260917_124307_careers_cms.down,
    name: '20260917_124307_careers_cms'
  },
  {up: workspaceAccess.up, down: workspaceAccess.down, name: "20260930_221300_workspace_access"},
  {up: publicSubmissions.up, down: publicSubmissions.down, name: "20261001_120000_public_submissions"},
  {up:listingReview.up,down:listingReview.down,name:'20261001_160000_listing_review'},
  {up:listingEmails.up,down:listingEmails.down,name:'20261008_130000_listing_emails'},
  {up:listingChanges.up,down:listingChanges.down,name:'20261008_140000_listing_changes'},
];
