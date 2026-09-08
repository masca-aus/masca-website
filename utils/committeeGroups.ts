import type { CommitteeMember } from "@/utils/committee"
import { COMMITTEE_DEPARTMENT_GROUPS } from "@/utils/committeeDepartments"

export type CommitteeGroup = {
  department: CommitteeMember["department"]
  label: string
  accent: string
  members: CommitteeMember[]
}
/** Groups an already-sorted member list without disturbing its admin drag order. */
export function getCommitteeGroups(members: CommitteeMember[]): CommitteeGroup[] {
  return COMMITTEE_DEPARTMENT_GROUPS.flatMap((group) => {
    const groupedMembers = members.filter(
      (member) => member.department === group.value,
    )

    return groupedMembers.length > 0
      ? [{
          department: group.value as CommitteeMember["department"],
          label: group.label,
          accent: group.accent,
          members: groupedMembers,
        }]
      : []
  })
}
