import { createTheme, alpha } from "@mui/material/styles";

export const getMuiTheme = (mode = "dark") =>
  createTheme({
    palette: {
      mode,
      primary: { main: "#7c3aed" },

      ...(mode === "dark"
        ? {
            background: { default: "#0b0b10", paper: "#0f1016" },
            divider: "rgba(255,255,255,0.10)",
          }
        : {
            background: { default: "#f5f6fa", paper: "#ffffff" },
            divider: "rgba(15,15,20,0.10)",
          }),
    },

    shape: { borderRadius: 14 },

    typography: {
      fontFamily: [
        "Inter",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "Arial",
        "sans-serif",
      ].join(","),
      h4: { fontWeight: 800 },
      h5: { fontWeight: 800 },
      h6: { fontWeight: 800 },
      button: { fontWeight: 800, textTransform: "none" },
    },

    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${mode === "dark" ? alpha("#fff", 0.10) : alpha("#000", 0.08)}`,
            boxShadow:
              mode === "dark"
                ? `0 12px 40px ${alpha("#000", 0.55)}`
                : `0 12px 30px ${alpha("#000", 0.12)}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${mode === "dark" ? alpha("#fff", 0.10) : alpha("#000", 0.08)}`,
            backgroundColor:
              mode === "dark" ? alpha("#0b0b10", 0.75) : alpha("#ffffff", 0.8),
            backdropFilter: "blur(10px)",
          },
        },
      },
    },
  });
