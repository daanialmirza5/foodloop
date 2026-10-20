"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const PALETTE = ["#22603f", "#6cab3f", "#ec9b1c", "#7fb495", "#a86509", "#153d29", "#aed1bb"];

export function MonthlyBar({ data }: { data: { month: string; kg: number }[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No confirmed deliveries in this period.</p>;
  const rows = data.map((d) => ({ ...d, label: new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Kilograms delivered per month">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#0000000d" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} unit=" kg" width={60} />
          <Tooltip cursor={{ fill: "#eef5f0" }} formatter={(v) => [`${Number(v).toLocaleString("en-IN")} kg`, "Delivered"]} contentStyle={{ borderRadius: 12, border: "1px solid #0000000f" }} />
          <Bar dataKey="kg" fill="#22603f" radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelBar({ data }: { data: { stage: string; kg: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Food offered, accepted, collected and delivered in kilograms">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#0000000d" />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} unit=" kg" />
          <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={88} />
          <Tooltip formatter={(v) => [`${Number(v).toLocaleString("en-IN")} kg`, ""]} contentStyle={{ borderRadius: 12, border: "1px solid #0000000f" }} />
          <Bar dataKey="kg" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  const rows = data.filter((d) => d.value > 0);
  if (!rows.length) return <p className="py-10 text-center text-sm text-muted">No data yet.</p>;
  return (
    <div className="h-64 w-full" role="img" aria-label="Breakdown chart">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
            {rows.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} contentStyle={{ borderRadius: 12, border: "1px solid #0000000f" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
