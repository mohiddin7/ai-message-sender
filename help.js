// help.html's only interactive bit: the shared header Tour button.
import { launchTour } from "./src/lib/tour-launch.js";

document.getElementById("nav-tour-header")?.addEventListener("click", launchTour);
