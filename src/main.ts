import "./style.css";
import { Application } from "./app/Application";

async function main(): Promise<void> {
  const app = new Application();
  await app.initialize();
}

main();