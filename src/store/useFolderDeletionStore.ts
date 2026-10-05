import { create } from 'zustand';
import { getErrorMessage } from '@/utils/error';
import { subscribeAuthSession } from '@/utils/authSession';

interface FolderDeletionRequest {
  folderNames: string[];
  selectedGameCount?: number;
  onDelete: () => Promise<void>;
  onSuccess?: () => void;
}

interface FolderDeletionState {
  request: FolderDeletionRequest | null;
  isDeleting: boolean;
  error: string | null;
  requestDeletion: (request: FolderDeletionRequest) => void;
  cancelDeletion: () => void;
  confirmDeletion: () => Promise<void>;
  resetDeletion: () => void;
}

export const useFolderDeletionStore = create<FolderDeletionState>((set, get) => ({
  request: null,
  isDeleting: false,
  error: null,

  requestDeletion: (request) => {
    if (get().request || request.folderNames.length === 0) return;
    set({ request: { ...request, folderNames: [...request.folderNames] }, error: null });
  },

  cancelDeletion: () => {
    if (!get().isDeleting) get().resetDeletion();
  },

  confirmDeletion: async () => {
    const { request, isDeleting } = get();
    if (!request || isDeleting) return;
    set({ isDeleting: true, error: null });
    try {
      await request.onDelete();
      if (get().request === request) {
        request.onSuccess?.();
        get().resetDeletion();
      }
    } catch (err: unknown) {
      if (get().request === request) {
        set({ error: getErrorMessage(err, '폴더를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.') });
      }
    } finally {
      if (get().request === request) set({ isDeleting: false });
    }
  },

  resetDeletion: () => set({ request: null, isDeleting: false, error: null }),
}));

subscribeAuthSession(() => useFolderDeletionStore.getState().resetDeletion());
