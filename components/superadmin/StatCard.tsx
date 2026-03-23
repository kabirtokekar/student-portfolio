import { TrendingUp, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange" | "red";
}

const colorClasses = {
  blue: "bg-blue-50 border-blue-200 text-blue-600",
  green: "bg-green-50 border-green-200 text-green-600",
  purple: "bg-purple-50 border-purple-200 text-purple-600",
  orange: "bg-orange-50 border-orange-200 text-orange-600",
  red: "bg-red-50 border-red-200 text-red-600",
};

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon: Icon,
  color 
}: StatCardProps) {
  return (
    <div className={`p-6 rounded-xl border ${colorClasses[color]} bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-50`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === "up" ? "text-green-600" : 
            trend === "down" ? "text-red-600" : "text-gray-500"
          }`}>
            {trend === "up" && <TrendingUp size={16} />}
            {trendValue}
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}