import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";

import { CssBaseline, ThemeProvider } from "@mui/material";

import "./styles/index.css";
import { router } from "./app/router";
import { getMuiTheme } from "./theme/muiTheme";
import { useUiStore } from "./app/store/ui.store";

function AppProviders() {
  const { themeMode } = useUiStore();
  const theme = React.useMemo(() => getMuiTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>
);
