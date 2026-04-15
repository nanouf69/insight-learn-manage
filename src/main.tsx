import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Patch for React/Radix removeChild DOM error (known issue with Select/Dialog portals)
const origRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    console.warn('[DOM Patch] removeChild: node not a child, skipping');
    return child;
  }
  return origRemoveChild.call(this, child) as T;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);