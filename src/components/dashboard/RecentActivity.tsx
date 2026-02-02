import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, UserPlus, FileCheck, CreditCard } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "inscription",
    message: "Jean Martin s'est inscrit à",
    target: "React Avancé",
    time: "Il y a 5 min",
    icon: UserPlus,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    id: 2,
    type: "formation",
    message: "Session terminée pour",
    target: "JavaScript Fondamentaux",
    time: "Il y a 1h",
    icon: GraduationCap,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: 3,
    type: "document",
    message: "Convention signée par",
    target: "Sophie Bernard",
    time: "Il y a 2h",
    icon: FileCheck,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
  {
    id: 4,
    type: "paiement",
    message: "Paiement reçu de",
    target: "Entreprise XYZ - 2 400€",
    time: "Il y a 3h",
    icon: CreditCard,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
];

export function RecentActivity() {
  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Activité récente</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${activity.iconBg}`}>
              <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                {activity.message}{" "}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
