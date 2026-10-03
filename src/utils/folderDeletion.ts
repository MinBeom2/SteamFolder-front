export const confirmFolderDeletion = (folderNames: string[], selectedGameCount = 0): boolean => {
  if (folderNames.length === 0) return true;

  const target = folderNames.length === 1
    ? `'${folderNames[0]}' 폴더`
    : `선택한 폴더 ${folderNames.length}개`;
  const gameMessage = selectedGameCount > 0
    ? `\n선택한 게임 ${selectedGameCount}개도 폴더에서 제거됩니다.`
    : '';

  return window.confirm(
    `${target}와 하위 폴더 및 배치된 게임을 모두 삭제하시겠습니까?${gameMessage}\n삭제한 내용은 되돌릴 수 없습니다.`
  );
};
