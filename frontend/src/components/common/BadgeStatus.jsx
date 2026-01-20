export default function BadgeStatus({ text = "—", variant = "default" }) {
  const map = {
    default: "bg-zinc-800 text-zinc-200",
    ok: "bg-emerald-900/60 text-emerald-200",
    warn: "bg-amber-900/60 text-amber-200",
    danger: "bg-red-900/60 text-red-200",
  };

  return (
    <span className={`px-2 py-1 rounded-lg text-xs ${map[variant] || map.default}`}>
      {text}
    </span>
  );
}
