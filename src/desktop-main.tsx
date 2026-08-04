import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/app/globals.css";
import { GeneEngineeringLab } from "@/src/components/GeneEngineeringLab";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Desktop application root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <GeneEngineeringLab />
  </StrictMode>,
);
