import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { BrowserRouter } from "react-router"
import "./index.css"
import App from "./App.tsx"
import { persistOptions, queryClient } from "@/lib/query"
import { aplicarPreferencias } from "@/lib/preferencias"

aplicarPreferencias()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
