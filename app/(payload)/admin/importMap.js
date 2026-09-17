import { EventDateRangeField } from '../../../components/admin/EventDateRangeField'
import { EventPublicationStatusCell } from '../../../components/admin/EventStatusCell'
import { EventEditorView, EventPublishControl, EventUnpublishControl } from '../../../components/admin/EventEditorView'
import { EventEditorHeader, EventEditorFooter } from '../../../components/admin/EventEditorFields'
import { EventSaveController } from '../../../components/admin/EventSaveController'
import { MascaIcon as MascaIcon_ca074f1e859f5791d4c63048dc4f7c84 } from '../../../components/admin/MascaBrand'
import { MascaLogo as MascaLogo_ca074f1e859f5791d4c63048dc4f7c84 } from '../../../components/admin/MascaBrand'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'
import { MascaDashboard as MascaDashboard_72c4387a9706020af1c627168ef507af } from '../../../components/admin/MascaDashboard'
import { AdminNavigationEnhancements as AdminNavigationEnhancements_1f3a691c3c080a3c2a5f08db8e4b9d2c } from '../../../components/admin/AdminNavigationEnhancements'
import { ThemeToggle as ThemeToggle_b201f7b2d7f4b20a0ea5a1d0d8cf3052 } from '../../../components/admin/ThemeToggle'
import { EventReviewStatusCell as EventReviewStatusCell_265b004044af2986365b52ad4c5edc0f } from '../../../components/admin/EventStatusCell'
import { EditorSection as EditorSection_49f4d02bb7f4d1c0e8767b6ff7c8fc2d } from '../../../components/admin/EditorSection'
import { DocumentBackLink as DocumentBackLink_02f771b7e0653f767d9f17323d526a53 } from '../../../components/admin/DocumentBackLink'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'

/** @type import('payload').ImportMap */
export const importMap = {
  "/components/admin/EventDateRangeField#EventDateRangeField": EventDateRangeField,
  "/components/admin/EventStatusCell#EventPublicationStatusCell": EventPublicationStatusCell,
  "/components/admin/EventEditorView#EventEditorView": EventEditorView,
  "/components/admin/EventEditorView#EventPublishControl": EventPublishControl,
  "/components/admin/EventEditorView#EventUnpublishControl": EventUnpublishControl,
  "/components/admin/EventEditorFields#EventEditorHeader": EventEditorHeader,
  "/components/admin/EventEditorFields#EventEditorFooter": EventEditorFooter,
  "/components/admin/EventSaveController#EventSaveController": EventSaveController,
  "/components/admin/MascaBrand#MascaIcon": MascaIcon_ca074f1e859f5791d4c63048dc4f7c84,
  "/components/admin/MascaBrand#MascaLogo": MascaLogo_ca074f1e859f5791d4c63048dc4f7c84,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24,
  "/components/admin/MascaDashboard#MascaDashboard": MascaDashboard_72c4387a9706020af1c627168ef507af,
  "/components/admin/AdminNavigationEnhancements#AdminNavigationEnhancements": AdminNavigationEnhancements_1f3a691c3c080a3c2a5f08db8e4b9d2c,
  "/components/admin/ThemeToggle#ThemeToggle": ThemeToggle_b201f7b2d7f4b20a0ea5a1d0d8cf3052,
  "/components/admin/EventStatusCell#EventReviewStatusCell": EventReviewStatusCell_265b004044af2986365b52ad4c5edc0f,
  "/components/admin/EditorSection#EditorSection": EditorSection_49f4d02bb7f4d1c0e8767b6ff7c8fc2d,
  "/components/admin/DocumentBackLink#DocumentBackLink": DocumentBackLink_02f771b7e0653f767d9f17323d526a53,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1
}
