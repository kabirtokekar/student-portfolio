// Define the type for color keys
type ColorKey = "blue" | "green" | "purple" | "orange" | "red";

// Update the component props
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  trend 
}: { 
  title: string; 
  value: number; 
  subtitle?: string; 
  icon: any; 
  color: ColorKey; 
  trend?: string;
}) {
  const colors: Record<ColorKey, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    red: "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div className={`p-6 rounded-xl border ${colors[color]} bg-white shadow-sm hover:shadow-md transition-shadow`}>
      {/* rest of component */}
    </div>
  );
}