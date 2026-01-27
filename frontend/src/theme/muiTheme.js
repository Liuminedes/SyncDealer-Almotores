import { createTheme, alpha } from "@mui/material/styles";

const fontStack = [
  "Inter",
  "system-ui",
  "-apple-system",
  "Segoe UI",
  "Roboto",
  "Helvetica",
  "Arial",
  "sans-serif",
].join(",");

export const getMuiTheme = (mode = "dark") => {
  const isDark = mode === "dark";

  const base = createTheme({
    palette: {
      mode,
      primary: { main: "#3aeda8" }, // morado corporativo
      secondary: { main: "#06d48f" }, // acento
      background: {
        default: isDark ? "#0B0B10" : "#F6F7FB",
        paper: isDark ? "#11111A" : "#FFFFFF",
      },
      divider: isDark ? alpha("#FFFFFF", 0.10) : alpha("#0B0B10", 0.08),
      text: {
        primary: isDark ? "#F2F4F8" : "#0B1220",
        secondary: isDark ? alpha("#F2F4F8", 0.70) : alpha("#0B1220", 0.62),
      },
    },

    shape: { borderRadius: 14 },

    typography: {
      fontFamily: fontStack,
      h4: { fontWeight: 900, letterSpacing: -0.5 },
      h5: { fontWeight: 900, letterSpacing: -0.3 },
      h6: { fontWeight: 800 },
      subtitle1: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 800 },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? "#0B0B10" : "#F6F7FB",
          },
          "*::-webkit-scrollbar": { width: 10, height: 10 },
          "*::-webkit-scrollbar-thumb": {
            background: isDark ? alpha("#fff", 0.14) : alpha("#0B1220", 0.14),
            borderRadius: 999,
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark
              ? alpha("#0B0B10", 0.72)
              : alpha("#FFFFFF", 0.72),
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${
              isDark ? alpha("#fff", 0.10) : alpha("#0B1220", 0.08)
            }`,
            color: "inherit",
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${
              isDark ? alpha("#fff", 0.10) : alpha("#0B1220", 0.08)
            }`,
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${
              isDark ? alpha("#fff", 0.10) : alpha("#0B1220", 0.08)
            }`,
            boxShadow: isDark
              ? `0 18px 50px ${alpha("#000", 0.55)}`
              : `0 14px 40px ${alpha("#0B1220", 0.10)}`,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${
              isDark ? alpha("#fff", 0.10) : alpha("#0B1220", 0.08)
            }`,
            backgroundColor: isDark
              ? alpha("#0B0B10", 0.86)
              : alpha("#FFFFFF", 0.86),
            backdropFilter: "blur(10px)",
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
          },
        },
      },

      MuiTextField: {
        defaultProps: {
          size: "medium",
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: isDark
              ? alpha("#FFFFFF", 0.04)
              : alpha("#0B1220", 0.03),
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark
                ? alpha("#FFFFFF", 0.20)
                : alpha("#0B1220", 0.18),
            },
          },
          notchedOutline: {
            borderColor: isDark
              ? alpha("#FFFFFF", 0.14)
              : alpha("#0B1220", 0.12),
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
          contained: {
            boxShadow: `0 12px 26px ${alpha("#3aeda8", 0.24)}`,
          },
        },
      },
    },
  });

  return base;
};
