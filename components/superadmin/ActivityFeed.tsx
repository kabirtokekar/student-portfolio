import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Shield, 
  AlertCircle,
  UserPlus,
  FileCheck
} from "lucide-react";

interface Activity {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  type: "create" | "update" | "delete" | "verify" | "login";
}

interface ActivityFeedProps {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "create": return <CheckCircle className="text-green-500" size={16} />;
    case "update": return <Clock className="text-blue-500" size={16} />;
    case "delete": return <XCircle className="text-red-500" size={16} />;
    case "verify": return <Shield className="text-purple-500" size={16} />;
    case "login": return <Shield className="text-orange-500" size={16} />;
    default: return <AlertCircle className="text-gray-500" size={16} />;
  }
};

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="text-gray-400" size={24} />
        </div>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {activities.map((activity) => (
        <div key={activity.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
          <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
            <p className="text-sm text-gray-600 mt-1">
              by <span className="font-medium">{activity.user}</span> • {activity.target}
            </p>
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}