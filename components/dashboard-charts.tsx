"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = ["#0e7490", "#16a34a", "#f59e0b", "#dc2626", "#64748b", "#7c3aed", "#0891b2"];
type ChartRow = Record<string, string | number>;

export function BarSimple({ data, dataKey, nameKey }: { data: unknown[]; dataKey: string; nameKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} fill="#0e7490" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieSimple({ data, dataKey, nameKey }: { data: ChartRow[]; dataKey: string; nameKey: string }) {
  const renderLabel = ({ payload }: { payload?: ChartRow }) => String(payload?.[nameKey] ?? "");

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          outerRadius={92}
          label={renderLabel}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LineSimple({ data, dataKey, nameKey }: { data: unknown[]; dataKey: string; nameKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke="#0e7490" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
