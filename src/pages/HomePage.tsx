import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { DesktopCanvas } from '@/components/desktop/DesktopCanvas';
import { ContextMenu } from '@/components/desktop/ContextMenu';
import { AddGameModal } from '@/components/modals/AddGameModal';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { EditFolderModal } from '@/components/modals/EditFolderModal';
import { DirectLoginModal } from '@/components/modals/DirectLoginModal';
import { GameDetailModal } from '@/components/modals/GameDetailModal';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useAuthStore } from '@/store/useAuthStore';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  const {
    isAddGameModalOpen,
    isDirectLoginModalOpen,
    isCreateFolderModalOpen,
    isEditFolderModalOpen,
    setAddGameModalOpen,
    setDirectLoginModalOpen,
    setCreateFolderModalOpen,
    setEditFolderModalOpen,
  } = useShowcaseStore();

  return (
    <div
      className={`text-[var(--text-primary)] flex flex-col transition-colors duration-300 ${
        !isAuthenticated
          ? 'h-screen overflow-hidden bg-[var(--bg-app)]'
          : 'min-h-screen bg-[var(--bg-app)]'
      }`}
    >
      {/* Top Navbar */}
      <Navbar />

      {/* Main Interactive 2D Grid Canvas */}
      <main className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        <DesktopCanvas />
      </main>

      {/* Global Desktop Context Menu */}
      <ContextMenu />

      {/* Global Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
      />

      <EditFolderModal
        isOpen={isEditFolderModalOpen}
        onClose={() => setEditFolderModalOpen(false)}
      />

      <AddGameModal
        isOpen={isAddGameModalOpen}
        onClose={() => setAddGameModalOpen(false)}
      />

      <DirectLoginModal
        isOpen={isDirectLoginModalOpen}
        onClose={() => setDirectLoginModalOpen(false)}
      />

      {/* Game Detail & Achievement Modal */}
      <GameDetailModal />
    </div>
  );
};

export default HomePage;
