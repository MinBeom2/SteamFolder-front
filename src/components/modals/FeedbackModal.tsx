import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import {
  submitFeedbackApi,
  type FeedbackCategory,
} from '@/api/feedback';
import { getErrorMessage } from '@/utils/error';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'BUG_REPORT', label: '오류 제보' },
  { value: 'FEATURE_REQUEST', label: '기능 제안' },
  { value: 'GENERAL', label: '기타 의견' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('BUG_REPORT');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const trimmedContent = content.trim();
  const isContentValid = trimmedContent.length >= 10 && trimmedContent.length <= 3000;

  const handleClose = () => {
    if (isSubmitting) return;
    setCategory('BUG_REPORT');
    setContent('');
    setError(null);
    setIsSubmitted(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isContentValid || isSubmitting) {
      setError('피드백 내용을 10자 이상 3,000자 이하로 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await submitFeedbackApi({ category, content: trimmedContent });
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '피드백을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">피드백 보내기</h3>
        </div>
      }
      maxWidth="lg"
      zIndex={70}
    >
      {isSubmitted ? (
        <div className="flex flex-col items-center py-7 text-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          <h4 className="mt-4 text-base font-bold text-[var(--text-primary)]">피드백이 접수되었습니다.</h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            보내주신 내용은 서비스 개선에 참고하겠습니다.
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-6 hover:translate-y-0" onClick={handleClose}>
            닫기
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div role="group" aria-label="피드백 종류" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                aria-pressed={category === item.value}
                className={`min-h-11 rounded-[3px] border px-2 text-sm font-semibold transition-colors ${
                  category === item.value
                    ? 'border-[var(--primary-accent)] bg-[var(--selection-bg)] text-[var(--primary-accent)]'
                    : 'border-[var(--border-card)] text-[var(--text-secondary)] hover:border-[var(--primary-accent)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="feedback-content" className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">
              피드백 내용
            </label>
            <textarea
              id="feedback-content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (error) setError(null);
              }}
              rows={7}
              maxLength={3000}
              aria-invalid={Boolean(error)}
              aria-describedby="feedback-content-help"
              placeholder="불편했던 점이나 필요한 기능을 자세히 알려주세요."
              className="w-full resize-none rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-surface-elevated)] px-3.5 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)]"
            />
            <div id="feedback-content-help" className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span role={error ? 'alert' : undefined} className={error ? 'text-red-700 dark:text-red-300' : 'text-[var(--text-muted)]'}>
                {error || '10자 이상 입력해 주세요.'}
              </span>
              <span className="tabular-nums text-[var(--text-muted)]">{content.length} / 3,000</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button type="button" variant="ghost" size="sm" className="hover:translate-y-0" onClick={handleClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" variant="cyan" size="sm" className="hover:translate-y-0" isLoading={isSubmitting} disabled={!isContentValid}>
              보내기
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
