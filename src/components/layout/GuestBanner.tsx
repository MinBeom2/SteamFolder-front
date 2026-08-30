import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const GuestBanner: React.FC = () => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#090d14]/95 backdrop-blur-md border-t border-slate-800/80 py-3.5 px-6 text-center">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-slate-300">
        <span>스팀 라이브러리를 이렇게 꾸미고 싶으신가요?</span>
        <Link
          to="/"
          className="text-[#00F0FF] hover:underline font-bold inline-flex items-center gap-1 transition-colors"
        >
          <span>스팀폴더로 나만의 쇼케이스 만들기</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
