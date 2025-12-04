import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';

interface WalkMetrics {
  activeClients: number;
  activeWalks: number;
  walksToday: number;
  totalWalks: number;
}

interface WalkerMetricsProps {
  metrics: WalkMetrics;
}

const WalkerMetrics = ({ metrics }: WalkerMetricsProps) => {
  const metricCards = [
    {
      title: 'Clientes Activos',
      value: metrics.activeClients,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Paseos Activos',
      value: metrics.activeWalks,
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Paseos Hoy',
      value: metrics.walksToday,
      icon: Calendar,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Total de Paseos',
      value: metrics.totalWalks,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {metricCards.map((metric, index) => (
        <Card 
          key={metric.title} 
          className="border-border/50 animate-scale-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardHeader className="pb-2">
            <div className={`w-10 h-10 ${metric.bgColor} rounded-lg flex items-center justify-center mb-2`}>
              <metric.icon className={`h-5 w-5 ${metric.color}`} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WalkerMetrics;
