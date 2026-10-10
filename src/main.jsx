import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css"; // must contain the Tailwind directives


ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
   
  </BrowserRouter>
);