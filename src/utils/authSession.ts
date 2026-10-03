let sessionVersion = 0;
const listeners = new Set<() => void>();

export const getAuthSessionVersion = () => sessionVersion;

export const invalidateAuthSession = () => {
  sessionVersion++;
  listeners.forEach((listener) => listener());
  return sessionVersion;
};

export const subscribeAuthSession = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
