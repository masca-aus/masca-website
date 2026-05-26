import gsap from "gsap"

function writeInOnScroll(
  target: gsap.TweenTarget,
  trigger: gsap.DOMTarget | null,
  options: gsap.TweenVars = {}
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { drawSVG: 0 },
    {
      drawSVG: "100%",
      duration: 0.3,
      stagger: 0.25,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top 80%",
      },
      ...options,
    }
  );
}



export { writeInOnScroll }