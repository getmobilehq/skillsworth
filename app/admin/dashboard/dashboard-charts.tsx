"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Eyebrow } from "@/components/ui";

const TIER_COLORS = ["#00B75B", "#8FC14E", "#FDC00D"];

export default function DashboardCharts({
  tiers,
  funnel,
  weekly,
}: {
  tiers: { name: string; value: number }[];
  funnel: { stage: string; value: number }[];
  weekly: { week: string; plays: number }[];
}) {
  return (
    <div className="flex flex-col gap-7">
      <section>
        <Eyebrow>Funnel</Eyebrow>
        <div className="mt-2 h-[220px] w-full rounded-card border-[1.5px] border-[#DCE6E0] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F0" />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#4A5C53" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#4A5C53" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#004931" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
        <section>
          <Eyebrow>Grade mix (A/B/C)</Eyebrow>
          <div className="mt-2 h-[220px] w-full rounded-card border-[1.5px] border-[#DCE6E0] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tiers}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {tiers.map((_, i) => (
                    <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <Eyebrow>Scored plays / week</Eyebrow>
          <div className="mt-2 h-[220px] w-full rounded-card border-[1.5px] border-[#DCE6E0] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F0" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#4A5C53" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#4A5C53" }} />
                <Tooltip />
                <Bar dataKey="plays" fill="#00B75B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
