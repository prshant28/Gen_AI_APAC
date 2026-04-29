import React from 'react';
import { Library, Database, StickyNote, Bookmark, FileText, Inbox } from 'lucide-react';
import TabbedPage from '../components/TabbedPage';
import VaultPage from './VaultPage';
import NotesPage from './NotesPage';
import BookmarksPage from './BookmarksPage';
import LibraryInboxTab from '../components/LibraryInboxTab';

const LibraryPage: React.FC = () => {
  return (
    <TabbedPage
      icon={Library}
      iconColor="#f472b6"
      iconBg="rgba(244,114,182,0.15)"
      title="Library"
      subtitle="Vault, notes, bookmarks, files & inbox — all your captured knowledge"
      paramKey="tab"
      defaultTab="vault"
      tabs={[
        { id: 'vault',     label: 'Vault',     icon: Database,    render: () => <VaultPage embedded /> },
        { id: 'notes',     label: 'Notes',     icon: StickyNote,  render: () => <NotesPage embedded /> },
        { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark,    render: () => <BookmarksPage embedded /> },
        { id: 'files',     label: 'Files',     icon: FileText,    render: () => <VaultPage embedded initialSourceFilter="pdf" /> },
        { id: 'inbox',     label: 'Inbox',     icon: Inbox,       render: () => <LibraryInboxTab /> },
      ]}
    />
  );
};

export default LibraryPage;
