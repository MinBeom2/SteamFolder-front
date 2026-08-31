import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { DesktopCanvas } from '@/components/desktop/DesktopCanvas';
import { ContextMenu } from '@/components/desktop/ContextMenu';
import { ShowcaseSettingsModal } from '@/components/modals/ShowcaseSettingsModal';
import { AddGameModal } from '@/components/modals/AddGameModal';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { EditFolderModal } from '@/components/modals/EditFolderModal';
import { DirectLoginModal } from '@/components/modals/DirectLoginModal';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const HomePage: React.FC = () => {
  const {
    isSettingsModalOpen,
    isAddGameModalOpen,
    isDirectLoginModalOpen,
    isCreateFolderModalOpen,
    isEditFolderModalOpen,
    setSettingsModalOpen,
    setAddGameModalOpen,
    setDirectLoginModalOpen,
    setCreateFolderModalOpen,
    setEditFolderModalOpen,
  } = useShowcaseStore();

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col justify-between selection:bg-[#00F0FF]/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Interactive 2D Grid Canvas */}
      <main className="flex-1 flex flex-col">
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

      <ShowcaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <DirectLoginModal
        isOpen={isDirectLoginModalOpen}
        onClose={() => setDirectLoginModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
