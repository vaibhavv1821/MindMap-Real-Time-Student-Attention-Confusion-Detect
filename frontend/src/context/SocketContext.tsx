import { createContext, useContext, ReactNode, useState } from 'react'
import { Socket } from 'socket.io-client'

interface SocketContextValue {
  socket: Socket | null
  setSocket: (socket: Socket | null) => void
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)

  return (
    <SocketContext.Provider value={{ socket, setSocket }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider')
  return ctx
}