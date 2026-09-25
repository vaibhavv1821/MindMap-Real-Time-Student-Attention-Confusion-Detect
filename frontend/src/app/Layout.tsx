import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-white">
      <main>
        <Outlet />
      </main>
    </div>
  )
}