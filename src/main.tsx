import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-400-italic.css";
import "./index.css";
import "./atmosphere.css";
import "./transitions.css";
import { installButtonSheen } from "./lib/buttonSheen";

installButtonSheen();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
