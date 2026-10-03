import React from 'react';
import { Modal } from '@/components/common/Modal';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="로그인이 필요합니다" maxWidth="sm">
    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
      좋아요를 누르려면 로그인해 주세요.
    </p>
    <SteamLoginButton size="lg" className="mt-6 [&>button]:w-full" />
  </Modal>
);
