import React from 'react';
import { GraduationCap, Sparkles, FlipHorizontal, Bell } from 'lucide-react';
import TabbedPage from '../components/TabbedPage';
import StudyPlanPage from './StudyPlanPage';
import FlashcardsPage from './FlashcardsPage';
import RevisitsPage from './RevisitsPage';

const LearnPage: React.FC = () => {
  return (
    <TabbedPage
      icon={GraduationCap}
      iconColor="#7c3aed"
      iconBg="rgba(124,58,237,0.15)"
      title="Learn"
      subtitle="Plans, flashcards, and revisits — everything that helps you remember"
      paramKey="tab"
      defaultTab="plan"
      tabs={[
        { id: 'plan',       label: 'Study Plan', icon: Sparkles,        render: () => <StudyPlanPage embedded /> },
        { id: 'flashcards', label: 'Flashcards', icon: FlipHorizontal,  render: () => <FlashcardsPage embedded /> },
        { id: 'revisits',   label: 'Revisits',   icon: Bell,            render: () => <RevisitsPage embedded /> },
      ]}
    />
  );
};

export default LearnPage;
