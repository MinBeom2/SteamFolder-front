import React from 'react';
import { Button } from '@/components/common/Button';
import { Sparkles } from 'lucide-react';
import { useShowcaseStore } from '@/store/useShowcaseStore';

interface SteamLoginButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showDemoOption?: boolean;
  className?: string;
}

export const SteamLoginButton: React.FC<SteamLoginButtonProps> = ({
  size = 'md',
  showDemoOption = true,
  className = '',
}) => {
  const { setDirectLoginModalOpen } = useShowcaseStore();

  const handleSteamRedirect = () => {
    // Steam OpenID 2.0 Authentication parameters
    const currentOrigin = window.location.origin;
    const returnTo = `${currentOrigin}/auth/callback`;
    const realm = currentOrigin;

    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });

    const steamOpenIdUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
    window.location.href = steamOpenIdUrl;
  };

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      <Button
        variant="steam"
        size={size}
        onClick={handleSteamRedirect}
        className="font-bold tracking-tight bg-gradient-to-r from-[#171a21] via-[#1b2838] to-[#2a475e] border border-[#66c0f4]/40 hover:border-[#66c0f4] hover:shadow-[0_0_20px_rgba(102,192,244,0.4)]"
        leftIcon={
          <svg className="w-5 h-5 fill-current text-[#66c0f4]" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 0 0-10 10c0 4.7 3.2 8.6 7.6 9.7l2.8-4.1a3.5 3.5 0 0 1 1.6-4.5V13a3.5 3.5 0 1 1 5.9-2.5 3.5 3.5 0 0 1-4.7 3.3l-3.3 4.8A10 10 0 0 0 22 12 10 10 0 0 0 12 2z"/>
          </svg>
        }
      >
        <span>스팀 계정으로 로그인</span>
      </Button>

      {showDemoOption && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => setDirectLoginModalOpen(true)}
          className="text-xs text-[#00F0FF] border border-[#00F0FF]/30 hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 transition-all font-semibold"
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />}
        >
          간편 / 데모 로그인
        </Button>
      )}
    </div>
  );
};
