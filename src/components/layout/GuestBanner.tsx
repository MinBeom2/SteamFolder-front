import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const GuestBanner: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-header)] backdrop-blur-md border-t border-[var(--border-subtle)] py-3.5 px-6 text-center shadow-lg transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <span>스팀 라이브러리를 꾸미고 싶으신가요?</span>
        <Link
          to="/"
          className="text-[var(--primary-accent)] hover:underline font-bold inline-flex items-center gap-1 transition-colors"
        >
          <span>스팀폴더로 나만의 쇼케이스 만들기</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
