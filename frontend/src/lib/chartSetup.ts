import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler, Title,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler, Title,
);

export const CHART_COLORS = [
  "#2563EB", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4",
  "#EC4899", "#8B5CF6", "#22C55E", "#F97316", "#0EA5E9", "#A855F7",
];

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { family: "Poppins", weight: 500 as const } } },
    tooltip: {
      backgroundColor: "rgba(15,23,42,0.95)",
      padding: 12,
      cornerRadius: 12,
      titleFont: { family: "Poppins", weight: 600 as const },
      bodyFont: { family: "Poppins" },
    },
  },
};
