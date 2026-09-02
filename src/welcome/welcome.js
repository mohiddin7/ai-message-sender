// welcome.js — inject the SVG sprite (so the remaining cards' icons render)
// and wire the header Tour button. The Quick-start wizard and the
// "Everything you can do" nav-hub were removed; the header nav covers
// both jobs now.

import { SPRITE_HTML } from "./sprite.js";
import { launchTour } from "../lib/tour-launch.js";

document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("sprite-host");
  if (host) host.innerHTML = SPRITE_HTML;
  document.getElementById("nav-tour-header")?.addEventListener("click", launchTour);
});
