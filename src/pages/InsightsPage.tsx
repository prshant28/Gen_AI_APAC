import React from 'react';
import { BarChart2, GitBranch, Network } from 'lucide-react';
import TabbedPage from '../components/TabbedPage';
import TimelinePage from './TimelinePage';
import GraphPage from './GraphPage';
import AnalyticsPage from './AnalyticsPage';

const InsightsPage: React.FC = () => {
  return (
    <TabbedPage
      icon={BarChart2}
      iconColor="#10b981"
      iconBg="rgba(16,185,129,0.15)"
      title="Insights"
      subtitle="Timeline, mind graph, and analytics — see your knowledge from every angle"
      paramKey="view"
      defaultTab="timeline"
      tabs={[
        { id: 'timeline',  label: 'Timeline',   icon: GitBranch, render: () => <TimelinePage embedded /> },
        { id: 'graph',     label: 'Mind Graph', icon: Network,   render: () => <GraphPage embedded /> },
        { id: 'analytics', label: 'Analytics',  icon: BarChart2, render: () => <AnalyticsPage embedded /> },
      ]}
    />
  );
};

export default InsightsPage;
