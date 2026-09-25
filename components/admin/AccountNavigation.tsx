'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DocumentBackLink } from './DocumentBackLink';
import './accountEditor.css';

/** The native account view owns authentication; add only the shared return navigation. */
export function AccountNavigation() {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    const findControls = () => {
      const controls = document.querySelector('.masca-account-page .collection-edit--users .doc-controls__content');
      setTarget(controls);
    };
    findControls();
    const observer = new MutationObserver(findControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return target ? createPortal(<DocumentBackLink />, target) : null;
}
