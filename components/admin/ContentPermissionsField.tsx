"use client";

import { useField } from "@payloadcms/ui";
import type { JSONFieldClientComponent } from "payload";
import { contentAreas, ownershipScopes, permissionAreas, permissionsFor, type ContentPermissions, type PermissionArea, type SectionPermission, type ContentArea } from "../../features/access/workspacePolicy";

const labels = { events: "Events", careers: "Careers", committee: "Committee", sponsors: "Sponsors", organisations: "Organisations", media: "Media" };
export const ContentPermissionsField: JSONFieldClientComponent = ({ path }) => {
  const { value, setValue, disabled, showError, errorMessage } = useField<ContentPermissions>({ path });
  const permissions = value ?? permissionsFor();
  const update = (area: PermissionArea, changes: Partial<SectionPermission>) => {
    const current = permissions[area] ?? { view: false, edit: false, scopes: [] };
    setValue({ ...permissions, [area]: { ...current, ...changes } });
  };
  return <fieldset className="masca-permissions" disabled={disabled}>
    <legend>Content permissions</legend>
    <p>Viewing includes all states. Editing is limited to the teams you tick below. Editors cannot manage people or account access.</p>
    <div className="masca-permissions__table">
      <div className="masca-permissions__row masca-permissions__head"><span>Section</span><span>Can view</span><span>Can edit</span></div>
      {permissionAreas.map(area => {
        const permission = permissions[area] ?? { view: false, edit: false, scopes: [] };
        return <div key={area}>
          <div className="masca-permissions__row">
            <span>{labels[area]}</span>
            <input type="checkbox" aria-label={`Can view ${labels[area]}`} checked={permission.view} onChange={e => update(area, { view: e.target.checked, ...(!e.target.checked ? { edit: false } : {}) })} />
            <input type="checkbox" aria-label={`Can edit ${labels[area]}`} checked={permission.edit} onChange={e => update(area, { edit: e.target.checked, ...(e.target.checked ? { view: true, scopes: permission.scopes.length ? permission.scopes : ["National"] } : {}) })} />
          </div>
          {permission.edit && contentAreas.includes(area as ContentArea) && <fieldset className="masca-permissions__scopes"><legend>Editing teams for {labels[area]}</legend>
            {ownershipScopes.map(scope => <label key={scope}><input type="checkbox" checked={permission.scopes.includes(scope)} onChange={e => update(area, { scopes: e.target.checked ? [...permission.scopes, scope] : permission.scopes.filter(s => s !== scope) })} />{scope}</label>)}
          </fieldset>}
        </div>;
      })}
    </div>
    {showError && <p role="alert">{errorMessage}</p>}
  </fieldset>;
};
