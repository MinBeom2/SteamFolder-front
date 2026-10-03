import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface QueryErrorProps {
  title?: string;
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  children?: React.ReactNode;
}

export const QueryError: React.FC<QueryErrorProps> = ({
  title = '목록을 불러오지 못했습니다',
  message,
  onRetry,
  isRetrying = false,
  children,
}) => (
  <div role="alert" aria-busy={isRetrying} className="rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-surface)] px-4 py-8 text-center sm:px-6">
    <AlertCircle className="mx-auto mb-3 h-6 w-6 text-[var(--text-secondary)]" aria-hidden="true" />
    <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{message}</p>
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
      <Button variant="secondary" className="min-h-11" onClick={onRetry} isLoading={isRetrying} leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
        {isRetrying ? '다시 불러오는 중…' : '다시 시도'}
      </Button>
      {children}
    </div>
  </div>
);
