// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";

import { CssBaseline, ThemeProvider } from "@mui/material";

import "./styles/index.css";
import { router }      from "./app/router";
import { getMuiTheme } from "./theme/muiTheme";
import { useUiStore }  from "./app/store/ui.store";
import { useAuthStore } from "./app/store/auth.store";

function AppProviders() {
  const { themeMode } = useUiStore();
  const theme         = React.useMemo(() => getMuiTheme(themeMode), [themeMode]);
  const initAuth      = useAuthStore((s) => s.init);

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Colores que coinciden con el tema oscuro de MUI (background.paper = #11111A aprox)
  const isDark = themeMode === "dark";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* ── React Hot Toast — configurado con el tema de SyncDealer ── */}
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 68 }} // deja espacio para el Topbar
        toastOptions={{
          duration: 3500,
          style: {
            background:   isDark ? "#1E1E2E" : "#ffffff",
            color:        isDark ? "#E2E8F0" : "#1A202C",
            border:       isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            borderRadius: "12px",
            fontSize:     "13px",
            fontWeight:   500,
            boxShadow:    isDark
              ? "0 8px 32px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(0,0,0,0.12)",
            padding:      "10px 14px",
            maxWidth:     "380px",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary:   "#68D391",   // green.300
              secondary: isDark ? "#1E1E2E" : "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary:   "#FC8181",   // red.300
              secondary: isDark ? "#1E1E2E" : "#fff",
            },
          },
          loading: {
            iconTheme: {
              primary:   "#63B3ED",   // blue.300
              secondary: isDark ? "#1E1E2E" : "#fff",
            },
          },
        }}
      />

      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>
);
