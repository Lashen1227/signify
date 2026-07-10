import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { AuthProvider } from "./providers/AuthProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
