'use client';

import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger, CustomEase);

export default function GsapInitializer() {
  useLayoutEffect(() => {
    // 1. Register the plugin
    gsap.registerPlugin(CustomEase);
    
    // 2. Define your global system ease
    CustomEase.create("entranceEase", "0.22, 1, 0.36, 1");
  }, []);

  return null; // This component doesn't render anything visually
}

gsap.registerEffect({
  name: "writeInOnScroll",
  effect: (target: gsap.TweenTarget, config: gsap.TweenVars) => {
    const { trigger, ...options } = config

    return gsap.fromTo(target, {
      drawSVG: "0%",
    }, {
      drawSVG: "100%",
      duration: 0.3,
      stagger: 0.25,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top 80%",
      },
      ...options,
    })
  }
})
