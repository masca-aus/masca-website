'use client'

import { useState } from 'react'
import type { CommitteeMember } from '@/utils/committee'
import { getCommitteeInitials, isCommitteePlaceholder } from '@/utils/committeeIdentity'

export default function CommitteePortrait({ member, className, alt = '' }: { member: CommitteeMember; className: string; alt?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const placeholder = isCommitteePlaceholder(member.img) || failedSrc === member.img
  return <span className={`${className}${placeholder ? ' is-placeholder' : ''}`}>
    {placeholder
      ? <span className="committee-initials" aria-hidden="true">{getCommitteeInitials(member)}</span>
      : <img src={member.img} alt={alt} loading="lazy" onError={() => setFailedSrc(member.img)} />}
  </span>
}
