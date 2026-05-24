'use client';

import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

export default function GsapInitializer() {
  useLayoutEffect(() => {
    // 1. Register the plugin
    gsap.registerPlugin(CustomEase);
    
    // 2. Define your global system ease
    CustomEase.create("entranceEase", "0.22, 1, 0.36, 1");
  }, []);

  return null; // This component doesn't render anything visually
}
