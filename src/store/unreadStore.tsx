/**
 * unreadStore.tsx
 * Minimal global store for the total unread chat count.
 * Updated by chat.tsx whenever conversations load or a socket event fires.
 * Read by _layout.tsx to show the live badge on the Chats tab.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UnreadContextType {
  totalUnread: number;
  setTotalUnread: (n: number) => void;
}

const UnreadContext = createContext<UnreadContextType>({
  totalUnread:    0,
  setTotalUnread: () => {},
});

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  return (
    <UnreadContext.Provider value={{ totalUnread, setTotalUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
