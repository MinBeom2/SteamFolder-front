import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { DesktopCanvas } from '@/components/desktop/DesktopCanvas';
import { ShowcaseSettingsModal } from '@/components/modals/ShowcaseSettingsModal';
import { AddGameModal } from '@/components/modals/AddGameModal';
import { DirectLoginModal } from '@/components/modals/DirectLoginModal';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const HomePage: React.FC = () => {
  const {
    isSettingsModalOpen,
    isAddGameModalOpen,
    isDirectLoginModalOpen,
    setSettingsModalOpen,
    setAddGameModalOpen,
    setDirectLoginModalOpen,
  } = useShowcaseStore();

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col justify-between selection:bg-[#00F0FF]/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Interactive Canvas */}
      <main className="flex-1 flex flex-col">
        <DesktopCanvas />
      </main>

      {/* Global Modals */}
      <ShowcaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <AddGameModal
        isOpen={isAddGameModalOpen}
        onClose={() => setAddGameModalOpen(false)}
      />

      <DirectLoginModal
        isOpen={isDirectLoginModalOpen}
        onClose={() => setDirectLoginModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
