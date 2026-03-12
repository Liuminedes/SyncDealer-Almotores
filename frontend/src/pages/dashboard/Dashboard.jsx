// frontend/src/pages/dashboard/Dashboard.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Stack,
  CircularProgress, Divider, MenuItem, TextField, Avatar,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  LinearProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid2";

import TrendingUpRoundedIcon           from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon         from "@mui/icons-material/TrendingDownRounded";
import PeopleAltRoundedIcon            from "@mui/icons-material/PeopleAltRounded";
import TaskAltRoundedIcon              from "@mui/icons-material/TaskAltRounded";
import DirectionsCarRoundedIcon        from "@mui/icons-material/DirectionsCarRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import HourglassBottomRoundedIcon      from "@mui/icons-material/HourglassBottomRounded";
import WarningAmberRoundedIcon         from "@mui/icons-material/WarningAmberRounded";
import EmojiEventsRoundedIcon          from "@mui/icons-material/EmojiEventsRounded";
import SellRoundedIcon                 from "@mui/icons-material/SellRounded";
import PaymentsRoundedIcon             from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon          from "@mui/icons-material/ReceiptLongRounded";
import CheckCircleRoundedIcon          from "@mui/icons-material/CheckCircleRounded";
import PendingRoundedIcon              from "@mui/icons-material/PendingRounded";
import CalendarMonthRoundedIcon        from "@mui/icons-material/CalendarMonthRounded";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, AreaChart, Area,
} from "recharts";

import { useAuthStore }   from "../../app/store/auth.store";
import { usePermissions } from "../../app/hooks/usePermissions";
import { dashboardApi }   from "../../api/dashboard.api";
import { salesApi }       from "../../api/sales.api";
import { http }           from "../../api/http";

// ── Constantes ──────────────────────────────────────────────────────────────
const MONTHS = [
  { v:1,  l:"Enero"      }, { v:2,  l:"Febrero"    }, { v:3,  l:"Marzo"      },
  { v:4,  l:"Abril"      }, { v:5,  l:"Mayo"        }, { v:6,  l:"Junio"      },
  { v:7,  l:"Julio"      }, { v:8,  l:"Agosto"      }, { v:9,  l:"Septiembre" },
  { v:10, l:"Octubre"    }, { v:11, l:"Noviembre"   }, { v:12, l:"Diciembre"  },
];
const MN     = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MNLONG = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ACCENT = ["#63b3ed","#68d391","#f6ad55","#fc8181","#9f7aea","#4fd1c5","#f687b3","#fbd38d"];

const fmt  = (n) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
const fmtM = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${fmt(v)}`;
};
const delta = (cur, prev) => {
  if (!prev || Number(prev) === 0) return null;
  return ((Number(cur) - Number(prev)) / Number(prev) * 100).toFixed(1);
};
const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
const now = new Date();

// Mes anterior
const prevMonth = (year, month) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

const STATUS_MAP = {
  DRAFT:            { label: "Borrador",         color: "default" },
  CALCULATED:       { label: "Por revisar",      color: "warning" },
  ADVISOR_APPROVED: { label: "Aprobada",         color: "info"    },
  ADVISOR_REJECTED: { label: "Rechazada",        color: "error"   },
  ASST_VALIDATED:   { label: "Validada",         color: "success" },
  SENT_TO_HR:       { label: "Enviada a RRHH",   color: "success" },
};

// ── Tooltip Recharts ─────────────────────────────────────────────────────────
function CTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 1, minWidth: 140 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>{label}</Typography>
      {payload.map((p, i) => (
        <Typography key={i} variant="body2" sx={{ fontWeight: 700, color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? fmtM(p.value) : fmt(p.value)}
        </Typography>
      ))}
    </Box>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#63b3ed" }) {
  if (!data?.length) return null;
  const id = `sg${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, accent = "#63b3ed", loading, pct, sparkData }) {
  const up = pct !== null && Number(pct) > 0;
  return (
    <Card sx={{ borderRadius: 2, height: "100%", position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />
      <CardContent sx={{ pl: 2.5, pb: sparkData ? "8px !important" : undefined }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.62rem" }}>
              {title}
            </Typography>
            {loading
              ? <CircularProgress size={18} sx={{ mt: 0.5, display: "block", color: accent }} />
              : <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.25, lineHeight: 1.1, fontSize: "1.6rem" }}>{value}</Typography>
            }
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>{subtitle}</Typography>
              {pct !== null && !loading && (
                <Chip size="small"
                  icon={up
                    ? <TrendingUpRoundedIcon   sx={{ fontSize: "0.75rem !important" }} />
                    : <TrendingDownRoundedIcon sx={{ fontSize: "0.75rem !important" }} />}
                  label={`${up ? "+" : ""}${pct}%`}
                  sx={{
                    height: 18, fontSize: "0.62rem", fontWeight: 800,
                    bgcolor: up ? "rgba(104,211,145,0.15)" : "rgba(252,129,129,0.15)",
                    color:   up ? "#68d391"              : "#fc8181",
                    border: `1px solid ${up ? "rgba(104,211,145,0.3)" : "rgba(252,129,129,0.3)"}`,
                    "& .MuiChip-icon": { color: up ? "#68d391" : "#fc8181", ml: "4px" },
                  }}
                />
              )}
            </Stack>
          </Box>
          <Box sx={{
            width: 38, height: 38, borderRadius: 1.5, display: "grid", placeItems: "center",
            bgcolor: `${accent}18`, border: `1px solid ${accent}30`, color: accent, flexShrink: 0, ml: 1,
          }}>
            {icon}
          </Box>
        </Stack>
        {sparkData && !loading && (
          <Box sx={{ mt: 0.5, mx: -0.5 }}>
            <Sparkline data={sparkData} color={accent} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, periodLabel, accent = "#63b3ed", description }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 900 }}>{title}</Typography>
          <Chip size="small" label={periodLabel}
            sx={{ fontWeight: 800, bgcolor: `${accent}18`, color: accent, border: `1px solid ${accent}44` }} />
        </Stack>
        {description && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>{description}</Typography>
        )}
      </Box>
    </Stack>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography sx={{ fontWeight: 900, fontSize: "0.72rem", letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", mb: 1.5 }}>
      {children}
    </Typography>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN / BRAND_OP
// ══════════════════════════════════════════════════════════════════════════════
function AdminDashboard() {
  const { user } = useAuthStore();

  // ── El selector representa el mes de VENTAS (sección 1).
  //    Las comisiones (sección 2) son del mismo mes seleccionado.
  //    Las ventas que originaron esas comisiones son del mes ANTERIOR.
  //
  //    Ejemplo: selecciono Marzo →
  //      Sección Ventas     = ventas de Marzo (sales_year/month = Marzo)
  //      Sección Comisiones = comisiones calculadas en Marzo
  //                           cuya base son las ventas de Febrero
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  // Mes anterior al seleccionado = mes de ventas que originó las comisiones
  const commSalesPeriod = useMemo(() => prevMonth(selYear, selMonth), [selYear, selMonth]);

  const load = useCallback(async (y, m) => {
    setLoading(true); setError(null);
    try {
      // sales_* = mes seleccionado (ventas recientes, sección 1)
      // comm_*  = mes seleccionado (comisiones generadas ese mes, sección 2)
      const res = await dashboardApi.getStats({
        sales_year:  y, sales_month:  m,
        comm_year:   y, comm_month:   m,
      });
      setData(res?.data ?? res);
    } catch {
      setError("No se pudieron cargar las estadísticas");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(selYear, selMonth); }, []);

  const handlePeriod = (y, m) => { setSelYear(y); setSelMonth(m); load(y, m); };

  const kpis         = data?.kpis         || {};
  const salesSummary = data?.salesSummary || {};
  const selLabel     = `${MNLONG[selMonth]} ${selYear}`;
  // Label del mes anterior (ventas que originaron las comisiones del mes seleccionado)
  const prevLabel    = `${MNLONG[commSalesPeriod.month]} ${commSalesPeriod.year}`;

  const sparkComm  = useMemo(() => (data?.sparkline || []).map((r) => ({ v: Number(r.total || 0) })),  [data]);
  const sparkUnits = useMemo(() => (data?.sparkline || []).map((r) => ({ v: Number(r.units || 0) })), [data]);

  const trendData = useMemo(() => {
    const map = new Map();
    for (const r of data?.monthlyTrend || []) {
      const key  = `${MN[r.cut_month]} ${r.cut_year}`;
      const prev = map.get(key) || { month: key, total: 0, units: 0 };
      prev.total += Number(r.total_commission || 0);
      prev.units += Number(r.units_total || 0);
      map.set(key, prev);
    }
    return Array.from(map.values());
  }, [data]);

  const pieData = useMemo(() =>
    (data?.byBrand || []).map((b, i) => ({ name: b.code, value: Number(b.total_commission || 0), color: ACCENT[i] })),
  [data]);

  const topData = useMemo(() =>
    (data?.topAdvisors || []).map((a, i) => ({
      name:  a.full_name?.split(" ").slice(0, 2).join(" ") || "—",
      total: Number(a.total_commission || 0),
      color: ACCENT[i],
    })),
  [data]);

  const vehicleData = useMemo(() =>
    (data?.salesByVehicle || []).map((v, i) => ({
      name:  `${v.model || ""} ${v.version || ""}`.trim().split(" ").slice(0, 2).join(" ") || "—",
      units: Number(v.units || 0),
      color: ACCENT[i],
    })),
  [data]);

  const coveragePct = useMemo(() => {
    const total   = Number(kpis.active_advisors || 0);
    const covered = Number(kpis.commissions_calculated || 0);
    return total > 0 ? Math.min(100, Math.round((covered / total) * 100)) : 0;
  }, [kpis]);

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      <Stack spacing={3}>

        {/* ── Header — selector único ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Dashboard</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
              Bienvenido, <b>{user?.full_name}</b>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, whiteSpace: "nowrap" }}>
              Mes de análisis:
            </Typography>
            <TextField select size="small" value={selYear}
              onChange={(e) => handlePeriod(Number(e.target.value), selMonth)} sx={{ width: 100 }}>
              {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" value={selMonth}
              onChange={(e) => handlePeriod(selYear, Number(e.target.value))} sx={{ width: 138 }}>
              {MONTHS.map((m) => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
            </TextField>
            <Chip label={loading ? "Cargando…" : error ? "Error" : "Live"} size="small"
              sx={{
                fontWeight: 800, fontSize: "0.7rem",
                bgcolor: error ? "rgba(252,129,129,0.15)" : "rgba(104,211,145,0.15)",
                color:   error ? "#fc8181" : "#68d391",
                border: `1px solid ${error ? "rgba(252,129,129,0.3)" : "rgba(104,211,145,0.3)"}`,
              }}
            />
          </Stack>
        </Stack>

        {error && (
          <Box sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "error.main", bgcolor: "rgba(252,129,129,0.06)" }}>
            <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECCIÓN 1 — VENTAS (mes seleccionado) — sin cambios
           ══════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          title="Ventas"
          periodLabel={selLabel}
          accent="#63b3ed"
          description="Unidades vendidas, asesores activos y modelos del mes seleccionado"
        />

        <Grid container spacing={2}>
          {[
            { title: "Unidades vendidas",    value: fmt(salesSummary.total_units),         subtitle: selLabel,                              accent: "#63b3ed", icon: <SellRoundedIcon fontSize="small" /> },
            { title: "Asesores con ventas",  value: fmt(salesSummary.advisors_with_sales), subtitle: `de ${fmt(kpis.active_advisors)} activos`, accent: "#68d391", icon: <PeopleAltRoundedIcon fontSize="small" /> },
            { title: "Modelos distintos",    value: fmt(salesSummary.distinct_vehicles),   subtitle: selLabel,                              accent: "#9f7aea", icon: <DirectionsCarRoundedIcon fontSize="small" /> },
            { title: "Valor total estimado", value: fmtM(salesSummary.total_value),        subtitle: selLabel,                              accent: "#f6ad55", icon: <AccountBalanceWalletRoundedIcon fontSize="small" /> },
          ].map((k) => (
            <Grid key={k.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard {...k} loading={loading} pct={null} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>Ventas por asesor</SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: "#63b3ed" }} /></Stack>
                  : (data?.salesByAdvisor || []).length === 0
                    ? <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>Sin ventas en el período</Typography>
                    : (
                      <Stack spacing={0.75}>
                        {(data.salesByAdvisor || []).map((a, i) => {
                          const maxU = Math.max(...(data.salesByAdvisor || []).map((x) => Number(x.units || 0)));
                          const p    = maxU > 0 ? (Number(a.units || 0) / maxU) * 100 : 0;
                          return (
                            <Box key={a.id || i}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
                                  {a.full_name?.split(" ").slice(0, 2).join(" ") || "—"}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="caption" sx={{ color: "#63b3ed", fontWeight: 800 }}>{a.units} u</Typography>
                                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{fmtM(a.total_value)}</Typography>
                                </Stack>
                              </Stack>
                              <LinearProgress variant="determinate" value={p}
                                sx={{ height: 4, borderRadius: 2, bgcolor: "action.hover",
                                  "& .MuiLinearProgress-bar": { borderRadius: 2, bgcolor: ACCENT[i % ACCENT.length] } }} />
                            </Box>
                          );
                        })}
                      </Stack>
                    )
                }
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>Unidades por modelo</SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: "#9f7aea" }} /></Stack>
                  : vehicleData.length === 0
                    ? <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>Sin ventas en el período</Typography>
                    : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={vehicleData} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} width={28} />
                          <RTooltip content={<CTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                          <Bar dataKey="units" name="Unidades" radius={[4, 4, 0, 0]}>
                            {vehicleData.map((_, i) => <Cell key={i} fill={ACCENT[i % ACCENT.length]} fillOpacity={0.85} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                }
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ══════════════════════════════════════════════════════════════════
            SECCIÓN 2 — COMISIONES (mes seleccionado)
            Las comisiones de este mes se calculan sobre las ventas del mes anterior
           ══════════════════════════════════════════════════════════════════ */}
        <Divider />
        <SectionHeader
          title="Comisiones"
          periodLabel={selLabel}
          accent="#f6ad55"
          description={`Comisiones calculadas en ${selLabel}, basadas en las ventas de ${prevLabel}`}
        />

        {/* KPIs comisiones */}
        <Grid container spacing={2}>
          {[
            {
              title: "Comisiones calculadas",
              value: fmt(kpis.commissions_calculated),
              subtitle: `Asesores liquidados en ${selLabel}`,
              accent: "#63b3ed",
              icon: <TaskAltRoundedIcon fontSize="small" />,
              pct: delta(kpis.commissions_calculated, kpis.prev_commissions_calculated),
              spark: sparkComm,
            },
            {
              title: "Total a pagar",
              value: fmtM(kpis.total_paid),
              subtitle: `Suma total de comisiones · ${selLabel}`,
              accent: "#f6ad55",
              icon: <AccountBalanceWalletRoundedIcon fontSize="small" />,
              pct: delta(kpis.total_paid, kpis.prev_total_paid),
              spark: sparkComm,
            },
            {
              title: "Promedio por asesor",
              value: fmtM(kpis.avg_commission),
              subtitle: "De las comisiones calculadas",
              accent: "#68d391",
              icon: <TrendingUpRoundedIcon fontSize="small" />,
              pct: delta(kpis.avg_commission, kpis.prev_avg_commission),
              spark: sparkComm,
            },
            {
              title: "Sin comisión aún",
              value: fmt(Math.max(0, Number(kpis.active_advisors || 0) - Number(kpis.commissions_calculated || 0))),
              subtitle: `Asesores activos pendientes de liquidar`,
              accent: "#fc8181",
              icon: <HourglassBottomRoundedIcon fontSize="small" />,
              pct: null,
            },
          ].map((k) => (
            <Grid key={k.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard {...k} loading={loading} sparkData={k.spark} />
            </Grid>
          ))}
        </Grid>

        {/* Cobertura */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: "0.72rem", letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary" }}>
                  Cobertura de liquidación — {selLabel}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  Asesores activos con comisión calculada en {selLabel}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 900, color: coveragePct === 100 ? "#68d391" : "#f6ad55", flexShrink: 0 }}>
                {kpis.commissions_calculated || 0} / {kpis.active_advisors || 0} ({coveragePct}%)
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={coveragePct}
              sx={{
                height: 8, borderRadius: 4, bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  background: coveragePct === 100
                    ? "linear-gradient(90deg,#68d391,#4fd1c5)"
                    : "linear-gradient(90deg,#63b3ed,#9f7aea)",
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Tendencia + distribución por marca */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>Tendencia de comisiones — últimos 6 meses</SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={24} sx={{ color: "#63b3ed" }} /></Stack>
                  : trendData.length === 0
                    ? <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>Sin datos suficientes</Typography>
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={trendData} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={58} />
                          <RTooltip content={<CTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                          <Bar dataKey="total" name="Comisiones" radius={[4, 4, 0, 0]}>
                            {trendData.map((_, i) => (
                              <Cell key={i} fill={i === trendData.length - 1 ? "#f6ad55" : "#63b3ed"} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                }
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>Distribución por marca</SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={24} sx={{ color: "#9f7aea" }} /></Stack>
                  : pieData.length === 0
                    ? <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>Sin datos</Typography>
                    : (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <RTooltip formatter={(v) => fmtM(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                        <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                          {pieData.map((b, i) => (
                            <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: b.color, flexShrink: 0 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>{b.name}</Typography>
                              </Stack>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>{fmtM(b.value)}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </>
                    )
                }
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top asesores + sin calcular */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>Top asesores por comisión — {selLabel}</SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: "#68d391" }} /></Stack>
                  : topData.length === 0
                    ? <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>Sin datos</Typography>
                    : (
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart data={topData} layout="vertical" barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                          <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#ccc" }} axisLine={false} tickLine={false} width={85} />
                          <RTooltip content={<CTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                          <Bar dataKey="total" name="Comisión" radius={[0, 4, 4, 0]}>
                            {topData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                }
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>
                  <Stack direction="row" spacing={1} alignItems="center" component="span">
                    <WarningAmberRoundedIcon sx={{ fontSize: 14, color: "#f6ad55" }} />
                    <span>Sin comisión calculada — {selLabel}</span>
                  </Stack>
                </SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: "#f6ad55" }} /></Stack>
                  : (data?.pendingAdvisors || []).length === 0
                    ? (
                      <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                        <TaskAltRoundedIcon sx={{ color: "#68d391", fontSize: 32 }} />
                        <Typography variant="body2" sx={{ color: "#68d391", fontWeight: 700 }}>
                          Todos los asesores tienen comisión calculada ✓
                        </Typography>
                      </Stack>
                    ) : (
                      <Stack spacing={1}>
                        {(data.pendingAdvisors || []).map((a) => (
                          <Stack key={a.id} direction="row" spacing={1.5} alignItems="center"
                            sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(246,173,85,0.06)", border: "1px solid rgba(246,173,85,0.15)" }}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: "0.7rem", fontWeight: 900, bgcolor: "rgba(246,173,85,0.2)", color: "#f6ad55" }}>
                              {initials(a.full_name)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.8rem" }} noWrap>{a.full_name}</Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>{a.branch_name || a.email}</Typography>
                            </Box>
                            <Chip size="small" label="Pendiente"
                              sx={{ fontSize: "0.62rem", fontWeight: 800, bgcolor: "rgba(246,173,85,0.15)", color: "#f6ad55", border: "1px solid rgba(246,173,85,0.3)" }} />
                          </Stack>
                        ))}
                      </Stack>
                    )
                }
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top vehículos + últimas comisiones */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent>
                <SectionTitle>
                  <Stack direction="row" spacing={1} alignItems="center" component="span">
                    <EmojiEventsRoundedIcon sx={{ fontSize: 14, color: "#f6ad55" }} />
                    <span>Top vehículos vendidos — {selLabel}</span>
                  </Stack>
                </SectionTitle>
                {loading
                  ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: "#f6ad55" }} /></Stack>
                  : (data?.topVehicles || []).length === 0
                    ? <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>Sin datos</Typography>
                    : (
                      <Stack spacing={1}>
                        {(data.topVehicles || []).map((v, i) => (
                          <Stack key={v.id || i} direction="row" spacing={1.5} alignItems="center"
                            sx={{ p: 1, borderRadius: 1.5, bgcolor: i === 0 ? "rgba(246,173,85,0.08)" : "action.hover", border: `1px solid ${i === 0 ? "rgba(246,173,85,0.2)" : "divider"}` }}>
                            <Box sx={{ width: 22, height: 22, borderRadius: 1, display: "grid", placeItems: "center",
                              bgcolor: i === 0 ? "rgba(246,173,85,0.2)" : "rgba(255,255,255,0.06)",
                              color: i === 0 ? "#f6ad55" : "text.secondary", fontSize: "0.7rem", fontWeight: 900, flexShrink: 0 }}>
                              {i + 1}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem" }} noWrap>
                                {v.model} {v.version}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.66rem" }}>
                                {v.units_sold} unid · {fmtM(v.total_commission)}
                              </Typography>
                            </Box>
                            {i === 0 && <EmojiEventsRoundedIcon sx={{ fontSize: 16, color: "#f6ad55" }} />}
                          </Stack>
                        ))}
                      </Stack>
                    )
                }
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: "0 !important" }}>
                {/* "Últimas corridas" → "Últimas comisiones" */}
                <SectionTitle>Últimas comisiones calculadas</SectionTitle>
              </CardContent>
              {loading
                ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: "#63b3ed" }} /></Stack>
                : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ "& th": { borderColor: "divider", bgcolor: "action.hover" } }}>
                          {["Asesor","Período","Marca","Unidades","Total","Estado"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.66rem", letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data?.recentRuns || []).length === 0
                          ? <TableRow><TableCell colSpan={6}>
                              <Typography variant="body2" sx={{ py: 2, color: "text.secondary", textAlign: "center" }}>Sin comisiones recientes</Typography>
                            </TableCell></TableRow>
                          : (data.recentRuns || []).map((r) => {
                              const st = STATUS_MAP[String(r.status).toUpperCase()] || { label: r.status, color: "default" };
                              return (
                                <TableRow key={r.id} hover sx={{ "& td": { borderColor: "divider" }, "&:last-child td": { borderBottom: "none" } }}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
                                      {r.advisor_name?.split(" ").slice(0, 2).join(" ") || "—"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontSize: "0.76rem", color: "text.secondary" }}>
                                      {MN[r.cut_month]} {r.cut_year}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                                      {r.fortnight === "FIRST" ? "1ra Q" : "2da Q"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip size="small" label={r.brand_code || r.brand_name} sx={{ fontWeight: 800, fontSize: "0.66rem" }} />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#63b3ed" }}>{r.units_total ?? 0}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "0.8rem" }}>{fmtM(r.total_commission)}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip size="small" label={st.label} color={st.color} sx={{ fontWeight: 800, fontSize: "0.66rem" }} />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        }
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              }
            </Card>
          </Grid>
        </Grid>

      </Stack>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADVISOR
// ══════════════════════════════════════════════════════════════════════════════
function AdvisorDashboard() {
  const { user } = useAuthStore();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [stats,   setStats]   = useState(null);
  const [runs,    setRuns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const years = [now.getFullYear() - 1, now.getFullYear()];

  const load = useCallback(async (y, m) => {
    setLoading(true); setError(null);
    try {
      // Ventas del mes seleccionado — el backend fuerza advisor_id por rol JWT
      const salesRes = await salesApi.list({
        cut_year:  y,
        cut_month: m,
        limit: 200, page: 1,
      });
      // salesApi.list retorna response.data (axios unwrap); backend devuelve { data: { items, total } }
      const salesData  = salesRes?.data ?? salesRes;
      const totalSales = Number(salesData?.total ?? (salesData?.items ?? []).length ?? 0);

      // Comisiones del mes seleccionado
      let runsData = [];
      try {
        const runsRes = await http.get("/commission-runs/my", { params: { year: y, month: m } });
        runsData = runsRes?.data?.data?.items ?? runsRes?.data?.items ?? [];
      } catch { /* silencioso */ }

      setStats({ totalSales });
      setRuns(runsData);
    } catch (e) {
      setError(e?.response?.data?.message || "Error al cargar datos");
    } finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { load(selYear, selMonth); }, []);

  const handlePeriod = (y, m) => { setSelYear(y); setSelMonth(m); load(y, m); };

  const totalComm   = runs.reduce((s, r) => s + (Number(r.total_commission) || 0), 0);
  const pendingRun  = runs.find((r) => r.status === "CALCULATED");
  const approvedRun = runs.find((r) => ["ADVISOR_APPROVED", "ASST_VALIDATED", "SENT_TO_HR"].includes(r.status));
  const selLabel    = `${MNLONG[selMonth]} ${selYear}`;

  if (loading) return <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}><CircularProgress sx={{ color: "#63b3ed" }} /></Stack>;
  if (error)   return <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "rgba(252,129,129,0.08)", border: "1px solid", borderColor: "error.main" }}><Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography></Box>;

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      <Stack spacing={3}>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Dashboard</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
              Bienvenido, <b>{user?.full_name?.split(" ")[0]}</b> 👋
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Mes:</Typography>
            <TextField select size="small" value={selYear} onChange={(e) => handlePeriod(Number(e.target.value), selMonth)} sx={{ width: 100 }}>
              {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" value={selMonth} onChange={(e) => handlePeriod(selYear, Number(e.target.value))} sx={{ width: 138 }}>
              {MONTHS.map((m) => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2}>
          {[
            { title: "Mis ventas",        value: fmt(stats?.totalSales), subtitle: `Ventas de ${selLabel}`,   accent: "#63b3ed", icon: <DirectionsCarRoundedIcon fontSize="small" /> },
            { title: "Mi comisión",       value: fmtM(totalComm),         subtitle: `Comisión de ${selLabel}`,       accent: "#f6ad55", icon: <PaymentsRoundedIcon fontSize="small" /> },
            { title: "Comisiones emitidas", value: fmt(runs.length),      subtitle: `Emitidas en ${selLabel}`,       accent: "#68d391", icon: <ReceiptLongRoundedIcon fontSize="small" /> },
          ].map((k) => (
            <Grid key={k.title} size={{ xs: 12, sm: 4 }}>
              <KpiCard {...k} loading={false} pct={null} />
            </Grid>
          ))}
        </Grid>

        {/* Nota de contexto */}
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.2)", borderLeft: "3px solid #63b3ed" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            📊 Ventas y comisiones del mes de <b>{selLabel}</b>.
          </Typography>
        </Box>

        {pendingRun && (
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.3)", borderLeft: "3px solid #f6ad55", cursor: "pointer" }}
            onClick={() => window.location.href = "/advisor/my-commission"}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PendingRoundedIcon sx={{ color: "#f6ad55", fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: "#f6ad55", fontWeight: 700, flex: 1 }}>
                Tienes una comisión pendiente de aprobar — {MN[pendingRun.cut_month]} {pendingRun.cut_year} · {fmtM(pendingRun.total_commission)}
              </Typography>
              <Chip label="Ir a Mi Comisión" size="small" sx={{ fontWeight: 800, bgcolor: "rgba(246,173,85,0.15)", color: "#f6ad55", border: "1px solid rgba(246,173,85,0.3)" }} />
            </Stack>
          </Box>
        )}
        {approvedRun && (
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(104,211,145,0.08)", border: "1px solid rgba(104,211,145,0.25)", borderLeft: "3px solid #68d391" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircleRoundedIcon sx={{ color: "#68d391", fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: "#68d391", fontWeight: 700 }}>
                Tu comisión de {MN[approvedRun.cut_month]} {approvedRun.cut_year} está en estado: <b>{STATUS_MAP[approvedRun.status]?.label || approvedRun.status}</b>
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Tabla */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ pb: "0 !important" }}>
            <SectionTitle>Mis comisiones — {selLabel}</SectionTitle>
          </CardContent>
          {runs.length === 0
            ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <ReceiptLongRoundedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>No hay comisiones para {selLabel}.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { borderColor: "divider", bgcolor: "action.hover" } }}>
                      {["Marca","Período","Quincena","Unidades","Total","Estado"].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.66rem", letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.map((r) => {
                      const st = STATUS_MAP[String(r.status).toUpperCase()] || { label: r.status, color: "default" };
                      return (
                        <TableRow key={r.id} hover sx={{ "& td": { borderColor: "divider" }, "&:last-child td": { borderBottom: "none" } }}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{r.brand_name}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.76rem" }}>{MN[r.cut_month]} {r.cut_year}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: "text.secondary" }}>{r.fortnight === "FIRST" ? "1ra" : "2da"}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: "#63b3ed" }}>{r.units_total ?? 0}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 900, color: "#f6ad55" }}>{fmtM(r.total_commission)}</Typography></TableCell>
                          <TableCell><Chip size="small" label={st.label} color={st.color} sx={{ fontWeight: 800, fontSize: "0.66rem" }} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </Card>

      </Stack>
    </Box>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const perms = usePermissions();
  if (perms.is.advisor) return <AdvisorDashboard />;
  return <AdminDashboard />;
}