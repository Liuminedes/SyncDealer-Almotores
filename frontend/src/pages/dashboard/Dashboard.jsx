import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Stack, Chip,
  CircularProgress, Divider, MenuItem, TextField, Avatar,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  LinearProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid2";

import TrendingUpRoundedIcon      from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon    from "@mui/icons-material/TrendingDownRounded";
import PeopleAltRoundedIcon       from "@mui/icons-material/PeopleAltRounded";
import TaskAltRoundedIcon         from "@mui/icons-material/TaskAltRounded";
import DirectionsCarRoundedIcon   from "@mui/icons-material/DirectionsCarRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import WarningAmberRoundedIcon    from "@mui/icons-material/WarningAmberRounded";
import EmojiEventsRoundedIcon     from "@mui/icons-material/EmojiEventsRounded";
import SellRoundedIcon            from "@mui/icons-material/SellRounded";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, Area, AreaChart,
} from "recharts";

import { useAuthStore }  from "../../app/store/auth.store";
import { dashboardApi }  from "../../api/dashboard.api";

// ── Constantes ─────────────────────────────────────────────────────────────
const MONTHS = [
  { v:1,  l:"Enero"      }, { v:2,  l:"Febrero"    }, { v:3,  l:"Marzo"      },
  { v:4,  l:"Abril"      }, { v:5,  l:"Mayo"        }, { v:6,  l:"Junio"      },
  { v:7,  l:"Julio"      }, { v:8,  l:"Agosto"      }, { v:9,  l:"Septiembre" },
  { v:10, l:"Octubre"    }, { v:11, l:"Noviembre"   }, { v:12, l:"Diciembre"  },
];
const MN = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ACCENT = ["#63b3ed","#68d391","#f6ad55","#fc8181","#9f7aea","#4fd1c5","#f687b3","#fbd38d"];

const fmt  = (n) => Number(n||0).toLocaleString("es-CO",{maximumFractionDigits:0});
const fmtM = (n) => {
  const v = Number(n||0);
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v/1_000).toFixed(0)}K`;
  return `$${fmt(v)}`;
};
const pctChange = (cur, prev) => {
  if (!prev || prev === 0) return null;
  return ((Number(cur) - Number(prev)) / Number(prev) * 100).toFixed(1);
};
const initials = (name="") => name.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();

const statusMap = {
  DRAFT:      { label:"Borrador",  color:"default" },
  CALCULATED: { label:"Calculada", color:"primary"  },
  APPROVED:   { label:"Aprobada",  color:"success"  },
  PAID:       { label:"Pagada",    color:"success"  },
};

// ── Custom Tooltip recharts ────────────────────────────────────────────────
function CTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor:"background.paper", border:"1px solid", borderColor:"divider", borderRadius:1.5, px:1.5, py:1, minWidth:140 }}>
      <Typography variant="caption" sx={{ color:"text.secondary", display:"block", mb:0.5 }}>{label}</Typography>
      {payload.map((p,i) => (
        <Typography key={i} variant="body2" sx={{ fontWeight:700, color:p.color||p.fill }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? fmtM(p.value) : fmt(p.value)}
        </Typography>
      ))}
    </Box>
  );
}

// ── Sparkline inline (sin ejes) ────────────────────────────────────────────
function Sparkline({ data = [], color = "#63b3ed" }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top:2, right:0, left:0, bottom:0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace("#","")})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card premium ───────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, accent="#63b3ed", loading, pct, sparkData }) {
  const up   = pct !== null && Number(pct) > 0;
  const down = pct !== null && Number(pct) < 0;
  return (
    <Card sx={{ borderRadius:2, height:"100%", position:"relative", overflow:"hidden" }}>
      <Box sx={{ position:"absolute", left:0, top:0, bottom:0, width:3, bgcolor:accent }} />
      <CardContent sx={{ pl:2.5, pb: sparkData ? "8px !important" : undefined }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex:1, minWidth:0 }}>
            <Typography variant="caption" sx={{ color:"text.secondary", letterSpacing:1, textTransform:"uppercase", fontSize:"0.62rem" }}>
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={18} sx={{ mt:0.5, display:"block", color:accent }} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight:900, mt:0.25, color:"text.primary", lineHeight:1.1, fontSize:"1.6rem" }}>
                {value}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt:0.5 }}>
              <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.68rem" }}>
                {subtitle}
              </Typography>
              {pct !== null && !loading && (
                <Chip
                  size="small"
                  icon={up ? <TrendingUpRoundedIcon sx={{ fontSize:"0.75rem !important" }} /> : <TrendingDownRoundedIcon sx={{ fontSize:"0.75rem !important" }} />}
                  label={`${up ? "+" : ""}${pct}%`}
                  sx={{
                    height:18, fontSize:"0.62rem", fontWeight:800,
                    bgcolor: up ? "rgba(104,211,145,0.15)" : "rgba(252,129,129,0.15)",
                    color:   up ? "#68d391" : "#fc8181",
                    border: `1px solid ${up ? "rgba(104,211,145,0.3)" : "rgba(252,129,129,0.3)"}`,
                    "& .MuiChip-icon": { color: up ? "#68d391" : "#fc8181", ml:"4px" },
                  }}
                />
              )}
            </Stack>
          </Box>
          <Box sx={{ width:38, height:38, borderRadius:1.5, display:"grid", placeItems:"center",
            bgcolor:`${accent}18`, border:`1px solid ${accent}30`, color:accent, flexShrink:0, ml:1 }}>
            {icon}
          </Box>
        </Stack>
        {sparkData && !loading && (
          <Box sx={{ mt:0.5, mx:-0.5 }}>
            <Sparkline data={sparkData} color={accent} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, action }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1.5 }}>
      <Typography sx={{ fontWeight:900, fontSize:"0.72rem", letterSpacing:1.2, textTransform:"uppercase", color:"text.secondary" }}>
        {children}
      </Typography>
      {action}
    </Stack>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }              = useAuthStore();
  const now                   = new Date();

  const defaultCommMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultCommYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [commYear,  setCommYear]  = useState(defaultCommYear);
  const [commMonth, setCommMonth] = useState(defaultCommMonth);
  const [salesYear,  setSalesYear]  = useState(now.getFullYear());
  const [salesMonth, setSalesMonth] = useState(now.getMonth() + 1);

  const load = useCallback((cy, cm, sy, sm) => {
    setLoading(true);
    dashboardApi.getStats({ comm_year: cy, comm_month: cm, sales_year: sy, sales_month: sm })
      .then((res) => { setData(res?.data ?? res); setError(null); })
      .catch(() => setError("No se pudieron cargar las estadísticas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(commYear, commMonth, salesYear, salesMonth); }, []);

  const handleCommFilter = (cy, cm) => {
    setCommYear(cy); setCommMonth(cm);
    load(cy, cm, salesYear, salesMonth);
  };

  const handleSalesFilter = (sy, sm) => {
    setSalesYear(sy); setSalesMonth(sm);
    load(commYear, commMonth, sy, sm);
  };

  const kpis        = data?.kpis   || {};
  const period      = data?.period || {};
  const periodLabel = period.month ? `${MN[period.month]} ${period.year}` : `${MN[commMonth]} ${commYear}`;

  // Sparkline data para KPIs
  const sparkMap = useMemo(() => {
    const arr = data?.sparkline || [];
    return arr.map(r => ({ v: Number(r.total||0) }));
  }, [data]);

  const unitsSparkMap = useMemo(() => {
    const arr = data?.sparkline || [];
    return arr.map(r => ({ v: Number(r.units||0) }));
  }, [data]);

  // Trend chart agrupado por mes
  const trendData = useMemo(() => {
    const map = new Map();
    for (const r of data?.monthlyTrend || []) {
      const key = `${MN[r.cut_month]} ${r.cut_year}`;
      const prev = map.get(key) || { month: key, total:0, units:0 };
      prev.total += Number(r.total_commission||0);
      prev.units += Number(r.units_total||0);
      map.set(key, prev);
    }
    return Array.from(map.values());
  }, [data]);

  const pieData = useMemo(() =>
    (data?.byBrand||[]).map((b,i) => ({ name:b.code, value:Number(b.total_commission||0), color:ACCENT[i] })),
  [data]);

  const topData = useMemo(() =>
    (data?.topAdvisors||[]).map((a,i) => ({
      name: a.full_name?.split(" ").slice(0,2).join(" ") || "—",
      total: Number(a.total_commission||0), color: ACCENT[i],
    })),
  [data]);

  const salesByVehicleData = useMemo(() =>
    (data?.salesByVehicle||[]).map((v,i) => ({
      name: v.model?.split(" ").slice(0,2).join(" ") || "—",
      units: Number(v.units||0), color: ACCENT[i],
    })),
  [data]);

  const coveragePct = useMemo(() => {
    const total   = Number(kpis.active_advisors||0);
    const covered = Number(kpis.commissions_calculated||0);
    if (!total) return 0;
    return Math.min(100, Math.round((covered / total) * 100));
  }, [kpis]);

  const salesSummary = data?.salesSummary || {};
  const salesMonthLabel = `${MN[salesMonth]} ${salesYear}`;

  // Años disponibles (últimos 3)
  const yearOptions = [now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2];

  return (
    <Box sx={{ width:"100%", pb:4 }}>
      <Stack spacing={3}>

        {/* ── Header ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight:900 }}>Dashboard</Typography>
            <Typography variant="body2" sx={{ color:"text.secondary", mt:0.25 }}>
              Bienvenido, <b>{user?.full_name}</b>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color:"text.secondary", fontWeight:700, whiteSpace:"nowrap" }}>
              Período comisiones:
            </Typography>
            <TextField select size="small" value={commYear}
              onChange={e => handleCommFilter(Number(e.target.value), commMonth)}
              sx={{ width:90 }}>
              {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" value={commMonth}
              onChange={e => handleCommFilter(commYear, Number(e.target.value))}
              sx={{ width:130 }}>
              {MONTHS.map(m => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
            </TextField>
            <Chip
              label={loading ? "Cargando…" : error ? "Error" : "Live"}
              size="small"
              sx={{
                fontWeight:800, fontSize:"0.7rem",
                bgcolor: error ? "rgba(252,129,129,0.15)" : "rgba(104,211,145,0.15)",
                color:   error ? "#fc8181" : "#68d391",
                border: `1px solid ${error ? "rgba(252,129,129,0.3)" : "rgba(104,211,145,0.3)"}`,
              }}
            />
          </Stack>
        </Stack>

        {error && (
          <Card sx={{ borderRadius:2, border:"1px solid", borderColor:"error.main" }}>
            <CardContent>
              <Typography variant="body2" sx={{ color:"error.main" }}>{error}</Typography>
            </CardContent>
          </Card>
        )}

        {/* ── KPIs Fila 1 ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs:12, sm:6, md:4 }}>
            <KpiCard title="Comisiones calculadas" value={fmt(kpis.commissions_calculated)}
              subtitle={periodLabel} icon={<TaskAltRoundedIcon fontSize="small"/>}
              accent="#63b3ed" loading={loading}
              pct={pctChange(kpis.commissions_calculated, kpis.prev_commissions_calculated)}
              sparkData={sparkMap} />
          </Grid>
          <Grid size={{ xs:12, sm:6, md:4 }}>
            <KpiCard title="Total comisiones pagadas" value={fmtM(kpis.total_paid)}
              subtitle={periodLabel} icon={<AccountBalanceWalletRoundedIcon fontSize="small"/>}
              accent="#f6ad55" loading={loading}
              pct={pctChange(kpis.total_paid, kpis.prev_total_paid)}
              sparkData={sparkMap} />
          </Grid>
          <Grid size={{ xs:12, sm:6, md:4 }}>
            <KpiCard title="Promedio por asesor" value={fmtM(kpis.avg_commission)}
              subtitle="Comisiones calculadas" icon={<TrendingUpRoundedIcon fontSize="small"/>}
              accent="#68d391" loading={loading}
              pct={pctChange(kpis.avg_commission, kpis.prev_avg_commission)}
              sparkData={sparkMap} />
          </Grid>
          <Grid size={{ xs:12, sm:6, md:4 }}>
            <KpiCard title="Unidades vendidas" value={fmt(kpis.sales_this_month)}
              subtitle={periodLabel} icon={<DirectionsCarRoundedIcon fontSize="small"/>}
              accent="#9f7aea" loading={loading}
              pct={pctChange(kpis.sales_this_month, kpis.prev_sales)}
              sparkData={unitsSparkMap} />
          </Grid>
          <Grid size={{ xs:12, sm:6, md:4 }}>
            <KpiCard title="Asesores activos" value={fmt(kpis.active_advisors)}
              subtitle="En el sistema" icon={<PeopleAltRoundedIcon fontSize="small"/>}
              accent="#4fd1c5" loading={loading} pct={null} />
          </Grid>
          <Grid size={{ xs:12, sm:6, md:4 }}>
            <KpiCard title="Pendientes de calcular" value={fmt(kpis.commissions_pending)}
              subtitle="Estado DRAFT" icon={<HourglassBottomRoundedIcon fontSize="small"/>}
              accent="#fc8181" loading={loading} pct={null} />
          </Grid>
        </Grid>

        {/* ── Cobertura de asesores ── */}
        <Card sx={{ borderRadius:2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1 }}>
              <Typography sx={{ fontWeight:900, fontSize:"0.72rem", letterSpacing:1.2, textTransform:"uppercase", color:"text.secondary" }}>
                Cobertura de asesores — {periodLabel}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight:900, color: coveragePct === 100 ? "#68d391" : "#f6ad55" }}>
                {kpis.commissions_calculated || 0} / {kpis.active_advisors || 0} asesores ({coveragePct}%)
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate" value={coveragePct}
              sx={{
                height:8, borderRadius:4,
                bgcolor:"action.hover",
                "& .MuiLinearProgress-bar": {
                  borderRadius:4,
                  background: coveragePct === 100
                    ? "linear-gradient(90deg,#68d391,#4fd1c5)"
                    : "linear-gradient(90deg,#63b3ed,#9f7aea)",
                },
              }}
            />
          </CardContent>
        </Card>

        {/* ── Gráficas principales ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs:12, md:8 }}>
            <Card sx={{ borderRadius:2, height:"100%" }}>
              <CardContent>
                <SectionTitle>Comisiones por mes (últimos 6 meses)</SectionTitle>
                {loading ? (
                  <Stack alignItems="center" sx={{ py:6 }}><CircularProgress size={24} sx={{ color:"#63b3ed" }}/></Stack>
                ) : trendData.length === 0 ? (
                  <Typography variant="body2" sx={{ color:"text.secondary", py:4, textAlign:"center" }}>Sin datos suficientes</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={trendData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                      <XAxis dataKey="month" tick={{ fontSize:11, fill:"#888" }} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={fmtM} tick={{ fontSize:11, fill:"#888" }} axisLine={false} tickLine={false} width={58}/>
                      <RTooltip content={<CTooltip/>} cursor={{ fill:"rgba(255,255,255,0.04)" }}/>
                      <Bar dataKey="total" name="Comisiones" radius={[4,4,0,0]}>
                        {trendData.map((_,i) => (
                          <Cell key={i} fill={i===trendData.length-1 ? "#f6ad55" : "#63b3ed"} fillOpacity={0.85}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs:12, md:4 }}>
            <Card sx={{ borderRadius:2, height:"100%" }}>
              <CardContent>
                <SectionTitle>Distribución por marca</SectionTitle>
                {loading ? (
                  <Stack alignItems="center" sx={{ py:6 }}><CircularProgress size={24} sx={{ color:"#9f7aea" }}/></Stack>
                ) : pieData.length === 0 ? (
                  <Typography variant="body2" sx={{ color:"text.secondary", py:4, textAlign:"center" }}>Sin datos</Typography>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <RTooltip formatter={(v) => fmtM(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <Stack spacing={0.75} sx={{ mt:0.5 }}>
                      {pieData.map((b,i) => (
                        <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width:8, height:8, borderRadius:"50%", bgcolor:b.color, flexShrink:0 }}/>
                            <Typography variant="caption" sx={{ fontWeight:700 }}>{b.name}</Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color:"text.secondary", fontWeight:700 }}>{fmtM(b.value)}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Top asesores + Asesores pendientes ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs:12, md:6 }}>
            <Card sx={{ borderRadius:2, height:"100%" }}>
              <CardContent>
                <SectionTitle>Top asesores — {periodLabel}</SectionTitle>
                {loading ? (
                  <Stack alignItems="center" sx={{ py:4 }}><CircularProgress size={20} sx={{ color:"#68d391" }}/></Stack>
                ) : topData.length === 0 ? (
                  <Typography variant="body2" sx={{ color:"text.secondary", py:3, textAlign:"center" }}>Sin datos</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={topData} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                      <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize:10, fill:"#888" }} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:"#ccc" }} axisLine={false} tickLine={false} width={85}/>
                      <RTooltip content={<CTooltip/>} cursor={{ fill:"rgba(255,255,255,0.04)" }}/>
                      <Bar dataKey="total" name="Comisión" radius={[0,4,4,0]}>
                        {topData.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.85}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs:12, md:6 }}>
            <Card sx={{ borderRadius:2, height:"100%" }}>
              <CardContent>
                <SectionTitle>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WarningAmberRoundedIcon sx={{ fontSize:14, color:"#f6ad55" }}/>
                    <span>Sin comisión calculada — {periodLabel}</span>
                  </Stack>
                </SectionTitle>
                {loading ? (
                  <Stack alignItems="center" sx={{ py:4 }}><CircularProgress size={20} sx={{ color:"#f6ad55" }}/></Stack>
                ) : (data?.pendingAdvisors||[]).length === 0 ? (
                  <Stack alignItems="center" spacing={1} sx={{ py:3 }}>
                    <TaskAltRoundedIcon sx={{ color:"#68d391", fontSize:32 }}/>
                    <Typography variant="body2" sx={{ color:"#68d391", fontWeight:700 }}>
                      Todos los asesores tienen comisión calculada ✓
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1}>
                    {(data.pendingAdvisors||[]).map((a) => (
                      <Stack key={a.id} direction="row" spacing={1.5} alignItems="center"
                        sx={{ p:1, borderRadius:1.5, bgcolor:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.15)" }}>
                        <Avatar sx={{ width:30, height:30, fontSize:"0.7rem", fontWeight:900, bgcolor:"rgba(246,173,85,0.2)", color:"#f6ad55" }}>
                          {initials(a.full_name)}
                        </Avatar>
                        <Box sx={{ flex:1, minWidth:0 }}>
                          <Typography variant="body2" sx={{ fontWeight:700, fontSize:"0.8rem" }} noWrap>{a.full_name}</Typography>
                          <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.68rem" }}>{a.branch_name || a.email}</Typography>
                        </Box>
                        <Chip size="small" label="Pendiente"
                          sx={{ fontSize:"0.62rem", fontWeight:800, bgcolor:"rgba(246,173,85,0.15)", color:"#f6ad55", border:"1px solid rgba(246,173,85,0.3)" }}/>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Mejor vehículo + últimas corridas ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs:12, md:4 }}>
            <Card sx={{ borderRadius:2, height:"100%" }}>
              <CardContent>
                <SectionTitle>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmojiEventsRoundedIcon sx={{ fontSize:14, color:"#f6ad55" }}/>
                    <span>Top vehículos — {periodLabel}</span>
                  </Stack>
                </SectionTitle>
                {loading ? (
                  <Stack alignItems="center" sx={{ py:4 }}><CircularProgress size={20} sx={{ color:"#f6ad55" }}/></Stack>
                ) : (data?.topVehicles||[]).length === 0 ? (
                  <Typography variant="body2" sx={{ color:"text.secondary", py:3, textAlign:"center" }}>Sin datos</Typography>
                ) : (
                  <Stack spacing={1}>
                    {(data.topVehicles||[]).map((v,i) => (
                      <Stack key={v.id} direction="row" spacing={1.5} alignItems="center"
                        sx={{ p:1, borderRadius:1.5, bgcolor:i===0?"rgba(246,173,85,0.08)":"action.hover",
                          border:`1px solid ${i===0?"rgba(246,173,85,0.2)":"divider"}` }}>
                        <Box sx={{ width:22, height:22, borderRadius:1, display:"grid", placeItems:"center",
                          bgcolor: i===0?"rgba(246,173,85,0.2)":"rgba(255,255,255,0.06)",
                          color: i===0?"#f6ad55":"text.secondary", fontSize:"0.7rem", fontWeight:900, flexShrink:0 }}>
                          {i+1}
                        </Box>
                        <Box sx={{ flex:1, minWidth:0 }}>
                          <Typography variant="body2" sx={{ fontWeight:700, fontSize:"0.78rem" }} noWrap>
                            {v.model} {v.version}
                          </Typography>
                          <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.66rem" }}>
                            {v.units_sold} unid · {fmtM(v.total_commission)}
                          </Typography>
                        </Box>
                        {i === 0 && <EmojiEventsRoundedIcon sx={{ fontSize:16, color:"#f6ad55" }}/>}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs:12, md:8 }}>
            <Card sx={{ borderRadius:2 }}>
              <CardContent sx={{ pb:"0 !important" }}>
                <SectionTitle>Últimas corridas calculadas</SectionTitle>
              </CardContent>
              {loading ? (
                <Stack alignItems="center" sx={{ py:4 }}><CircularProgress size={20} sx={{ color:"#63b3ed" }}/></Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ "& th": { borderColor:"divider", bgcolor:"action.hover" } }}>
                        {["Asesor","Período","Marca","Unidades","Total","Estado"].map(h => (
                          <TableCell key={h} sx={{ fontWeight:900, color:"text.secondary", fontSize:"0.66rem", letterSpacing:0.5, textTransform:"uppercase" }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data?.recentRuns||[]).length === 0 ? (
                        <TableRow><TableCell colSpan={6}>
                          <Typography variant="body2" sx={{ py:2, color:"text.secondary", textAlign:"center" }}>Sin corridas recientes</Typography>
                        </TableCell></TableRow>
                      ) : (
                        (data.recentRuns||[]).map((r) => {
                          const st = statusMap[String(r.status).toUpperCase()] || { label:r.status, color:"default" };
                          return (
                            <TableRow key={r.id} hover sx={{ "& td":{ borderColor:"divider" }, "&:last-child td":{ borderBottom:"none" } }}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight:700, fontSize:"0.78rem" }}>
                                  {r.advisor_name?.split(" ").slice(0,2).join(" ") || "—"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontSize:"0.76rem", color:"text.secondary" }}>
                                  {MN[r.cut_month]} {r.cut_year}
                                </Typography>
                                <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.65rem" }}>
                                  {r.fortnight === "FIRST" ? "1ra Q" : "2da Q"}
                                </Typography>
                              </TableCell>
                              <TableCell><Chip size="small" label={r.brand_code} sx={{ fontWeight:800, fontSize:"0.66rem" }}/></TableCell>
                              <TableCell><Typography variant="body2" sx={{ fontWeight:700, color:"#63b3ed" }}>{r.units_total??0}</Typography></TableCell>
                              <TableCell><Typography variant="body2" sx={{ fontWeight:900, color:"#f6ad55", fontSize:"0.8rem" }}>{fmtM(r.total_commission)}</Typography></TableCell>
                              <TableCell><Chip size="small" label={st.label} color={st.color} sx={{ fontWeight:800, fontSize:"0.66rem" }}/></TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Grid>
        </Grid>

        {/* ════════════════════════════════════════════════════════
            SECCIÓN VENTAS — con selector de mes
           ════════════════════════════════════════════════════════ */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight:900 }}>
                Ventas <Chip size="small" label={salesMonthLabel} sx={{ ml:1, fontWeight:800, bgcolor:"rgba(99,179,237,0.12)", color:"#63b3ed", border:"1px solid rgba(99,179,237,0.3)" }}/>
              </Typography>
              <Typography variant="body2" sx={{ color:"text.secondary" }}>
                Detalle de unidades vendidas por asesor y modelo
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <TextField select size="small" value={salesYear}
                onChange={e => handleSalesFilter(Number(e.target.value), salesMonth)}
                sx={{ width:100 }}>
                {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
              <TextField select size="small" value={salesMonth}
                onChange={e => handleSalesFilter(salesYear, Number(e.target.value))}
                sx={{ width:140 }}>
                {MONTHS.map(m => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
              </TextField>
            </Stack>
          </Stack>

          {/* KPIs de ventas */}
          <Grid container spacing={2} sx={{ mb:2 }}>
            {[
              { title:"Unidades vendidas", value:fmt(salesSummary.total_units),      accent:"#63b3ed", icon:<SellRoundedIcon fontSize="small"/> },
              { title:"Asesores con ventas", value:fmt(salesSummary.advisors_with_sales), accent:"#68d391", icon:<PeopleAltRoundedIcon fontSize="small"/> },
              { title:"Modelos distintos", value:fmt(salesSummary.distinct_vehicles), accent:"#9f7aea", icon:<DirectionsCarRoundedIcon fontSize="small"/> },
              { title:"Valor total estimado", value:fmtM(salesSummary.total_value),  accent:"#f6ad55", icon:<AccountBalanceWalletRoundedIcon fontSize="small"/> },
            ].map(k => (
              <Grid key={k.title} size={{ xs:12, sm:6, md:3 }}>
                <KpiCard {...k} subtitle={salesMonthLabel} loading={loading} pct={null}/>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            {/* Ventas por asesor */}
            <Grid size={{ xs:12, md:5 }}>
              <Card sx={{ borderRadius:2, height:"100%" }}>
                <CardContent>
                  <SectionTitle>Ventas por asesor</SectionTitle>
                  {loading ? (
                    <Stack alignItems="center" sx={{ py:4 }}><CircularProgress size={20} sx={{ color:"#63b3ed" }}/></Stack>
                  ) : (data?.salesByAdvisor||[]).length === 0 ? (
                    <Typography variant="body2" sx={{ color:"text.secondary", py:3, textAlign:"center" }}>Sin ventas en el período</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {(data.salesByAdvisor||[]).map((a,i) => {
                        const maxUnits = Math.max(...(data.salesByAdvisor||[]).map(x=>Number(x.units||0)));
                        const pct = maxUnits > 0 ? (Number(a.units||0)/maxUnits)*100 : 0;
                        return (
                          <Box key={a.id}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:0.25 }}>
                              <Typography variant="body2" sx={{ fontWeight:700, fontSize:"0.78rem" }}>
                                {a.full_name?.split(" ").slice(0,2).join(" ")||"—"}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Typography variant="caption" sx={{ color:"#63b3ed", fontWeight:800 }}>{a.units} u</Typography>
                                <Typography variant="caption" sx={{ color:"text.secondary" }}>{fmtM(a.total_value)}</Typography>
                              </Stack>
                            </Stack>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ height:4, borderRadius:2, bgcolor:"action.hover",
                                "& .MuiLinearProgress-bar": { borderRadius:2, bgcolor: ACCENT[i%ACCENT.length] } }}/>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Ventas por modelo */}
            <Grid size={{ xs:12, md:7 }}>
              <Card sx={{ borderRadius:2, height:"100%" }}>
                <CardContent>
                  <SectionTitle>Unidades por modelo</SectionTitle>
                  {loading ? (
                    <Stack alignItems="center" sx={{ py:4 }}><CircularProgress size={20} sx={{ color:"#9f7aea" }}/></Stack>
                  ) : salesByVehicleData.length === 0 ? (
                    <Typography variant="body2" sx={{ color:"text.secondary", py:4, textAlign:"center" }}>Sin ventas en el período</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={salesByVehicleData} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                        <XAxis dataKey="name" tick={{ fontSize:10, fill:"#888" }} axisLine={false} tickLine={false}/>
                        <YAxis tick={{ fontSize:10, fill:"#888" }} axisLine={false} tickLine={false} width={28}/>
                        <RTooltip content={<CTooltip/>} cursor={{ fill:"rgba(255,255,255,0.04)" }}/>
                        <Bar dataKey="units" name="Unidades" radius={[4,4,0,0]}>
                          {salesByVehicleData.map((_,i) => <Cell key={i} fill={ACCENT[i%ACCENT.length]} fillOpacity={0.85}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

      </Stack>
    </Box>
  );
}