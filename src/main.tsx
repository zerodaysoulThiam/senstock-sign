import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSession } from "./lib/auth";

const root = createRoot(document.getElementById("root")!);
initSession().finally(() => root.render(<App />));
