import "./style.css";
import "./profile.css";
import "./papas-blackjack.css";
import "./roulette.css";
import "./math-report.css";
import "./neema.css";
import "./megh.css";
import "./megh-fixes.css";
import "./progression.css";
import "./v50-polish.css";
import "./v53-bonus-revolution.css";
import "./v54-chaos.css";
import "./v55-premium.css";
import "./v58-living-floor.css";
import "./v59-authenticity.css";
import "./v60-foundation.css";
import "./v61-stability.css";
import { Application } from "./app/Application";

async function main(): Promise<void> {
  const app = new Application();
  await app.initialize();
}

main();
