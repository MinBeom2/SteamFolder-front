import React from 'react';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';

interface SteamLoginButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showDemoOption?: boolean;
  className?: string;
}

export const SteamLoginButton: React.FC<SteamLoginButtonProps> = ({
  size = 'md',
  showDemoOption = false,
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
        variant="cyan"
        size={size}
        onClick={handleSteamRedirect}
        className="font-medium cursor-pointer hover:translate-y-0"
      >
        <span>스팀 계정으로 로그인</span>
      </Button>

      {showDemoOption && (
        <Button
          variant="secondary"
          size={size}
          onClick={() => setDirectLoginModalOpen(true)}
          className="text-xs font-medium"
        >
          간편 / 데모 로그인
        </Button>
      )}
    </div>
  );
};
