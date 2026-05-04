import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Users, LayoutDashboard, LogOut } from 'lucide-react'
import { useStoreContext } from '@/store/StoreContext'

const navItems = [
  { to: '/admin/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/admin/shifts',    label: 'シフト管理',     icon: CalendarDays },
  { to: '/admin/staff',     label: 'スタッフ管理',   icon: Users },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { currentAdmin, logout } = useStoreContext()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <span className="font-bold text-lg tracking-wide">シフト管理</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block">{currentAdmin?.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 hover:text-blue-200">
            <LogOut size={16} />
            <span className="hidden sm:block">ログアウト</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* サイドバー（デスクトップ） */}
        <nav className="hidden sm:flex flex-col w-48 bg-white border-r pt-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors
                ${pathname.startsWith(to) ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-600'}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>

      {/* ボトムナビ（モバイル） */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center py-2 text-xs
              ${pathname.startsWith(to) ? 'text-blue-700' : 'text-gray-500'}`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
