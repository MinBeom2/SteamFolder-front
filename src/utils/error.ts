import type { ErrorResponse } from '@/types/auth';

const ERROR_CODE_MESSAGES: Record<string, string> = {
  F001: '존재하지 않는 폴더입니다.',
  F002: '해당 폴더에 대한 권한이 없습니다.',
  F003: '자식 폴더를 상위 폴더로 지정할 수 없습니다.',
  F004: '동일한 경로에 이미 같은 이름의 폴더가 존재합니다.',
  F005: '폴더의 깊이는 최대 5개 까지 가능합니다.',
  F006: '생성 가능한 최대 폴더 개수(100개)를 초과했습니다.',
  F007: '해당 폴더에 이미 추가된 게임입니다.',
  F008: '폴더당 배치할 수 있는 최대 게임 개수(102개)를 초과했습니다.',
  G001: '존재하지 않는 게임입니다.',
  G002: '보유하지 않은 게임입니다.',
  G003: '스팀 외부 API 호출 중 오류가 발생했습니다.',
  G004: "Steam 프로필 편집의 공개 설정에서 '내 프로필'과 '게임 세부 정보'를 모두 공개로 변경한 후 다시 시도해 주세요.",
  G005: '동기화 쿨다운(5분) 제한 중입니다.',
};

/**
 * 백엔드 ErrorResponse, AxiosError, 또는 클라이언트 throw Error 객체에서
 * 사용자에게 노출할 에러 사유 메시지를 안전하게 추출합니다.
 */
export const getErrorMessage = (
  err: unknown,
  fallback: string = '오류가 발생했습니다.'
): string => {
  if (!err) return fallback;

  // 1. Axios ErrorResponse 구조 확인
  const axiosError = err as {
    response?: {
      data?: ErrorResponse | string;
    };
  };

  const responseData = axiosError?.response?.data;

  if (responseData) {
    if (typeof responseData === 'object') {
      // Steam 비공개 오류는 화면마다 동일한 해결 방법을 안내합니다.
      if (responseData.code === 'G004') {
        return ERROR_CODE_MESSAGES.G004;
      }
      // 1-1. 백엔드에서 명시적으로 내려준 message
      if (typeof responseData.message === 'string' && responseData.message.trim()) {
        return responseData.message;
      }
      // 1-2. 백엔드 에러 코드(F005, F006 등) 매핑
      if (responseData.code && ERROR_CODE_MESSAGES[responseData.code]) {
        return ERROR_CODE_MESSAGES[responseData.code];
      }
      // 1-3. Validation 필드 에러 사유
      if (
        Array.isArray(responseData.errors) &&
        responseData.errors.length > 0 &&
        responseData.errors[0]?.reason
      ) {
        return responseData.errors[0].reason;
      }
    } else if (typeof responseData === 'string' && responseData.trim()) {
      return responseData;
    }
  }

  // 2. 프론트엔드 비즈니스 로직에서 throw한 Error (예: new Error('폴더의 깊이는 최대 5개 까지 가능합니다.'))
  if (err instanceof Error && err.message) {
    // Axios의 "Request failed with status code ..." 같은 일반 HTTP 에러 문구는 fallback 처리
    if (!err.message.startsWith('Request failed with status code')) {
      return err.message;
    }
  }

  return fallback;
};
