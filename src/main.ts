import "./style.css";
import "./profile.css";
import "./papas-blackjack.css";
import "./roulette.css";
import "./math-report.css";
import "./neema.css";
import "./megh.css";
import "./megh-fixes.css";
import "./progression.css";
import { Application } from "./app/Application";

async function main(): Promise<void> {
  const app = new Application();
  await app.initialize();
}

main();
