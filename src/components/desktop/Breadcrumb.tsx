import React from 'react';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { ChevronLeft } from 'lucide-react';

export const Breadcrumb: React.FC = () => {
  const { currentFolderName, goToRoot } = useShowcaseStore();

  if (!currentFolderName) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F0FF] uppercase mb-1">
        <button
          onClick={goToRoot}
          className="hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>CUSTOM SHOWCASE</span>
        </button>
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
        /{currentFolderName}/
      </h2>
    </div>
  );
};
