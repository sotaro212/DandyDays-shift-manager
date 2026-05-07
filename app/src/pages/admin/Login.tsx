import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStoreContext } from '@/store/StoreContext'
import { SetupSheet } from '@/components/SetupSheet'

function detectInAppBrowser(): boolean {
  const ua = navigator.userAgent
  // LINE, Facebook, Instagram, Twitter, WeChat, その他WebView
  if (/FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger/.test(ua)) return true
  // iOS でSafari/Chrome/Firefox以外（WebView）
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua)) return true
  // Android WebView
  if (/Android/.test(ua) && /wv/.test(ua)) return true
  return false
}

export function Login() {
  const { loginWithGoogle, createNewSheet, connectExistingSheet, isLoadingSheets } = useStoreContext()
  const navigate = useNavigate()
  const [step, setStep] = useState<'login' | 'setup'>('login')
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoggingIn(true)
    try {
      const result = await loginWithGoogle()
      if (result === 'needs_setup') {
        setStep('setup')
      } else {
        navigate('/admin/dashboard')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleCreateNew = async () => {
    await createNewSheet()
    navigate('/admin/dashboard')
  }

  const handleConnectExisting = async (id: string) => {
    await connectExistingSheet(id)
    navigate('/admin/dashboard')
  }

  if (step === 'setup') {
    return (
      <SetupSheet
        onCreateNew={handleCreateNew}
        onConnectExisting={handleConnectExisting}
        isLoading={isLoadingSheets}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dandy-50 to-dandy-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-dandy-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📅</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">シフト管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理者ログイン</p>
        </div>

        {!CLIENT_ID ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
            <p className="font-medium">⚠️ セットアップが必要です</p>
            <p>
              <code className="bg-amber-100 px-1 rounded">.env.local</code> に
              <code className="bg-amber-100 px-1 rounded ml-1">VITE_GOOGLE_CLIENT_ID</code> を設定してください。
            </p>
          </div>
        ) : detectInAppBrowser() ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <p className="font-medium text-amber-800 text-sm">⚠️ アプリ内ブラウザでは開けません</p>
            <p className="text-xs text-amber-700">
              LINEやInstagramなどのアプリ内ブラウザでは、GoogleログインがGoogleのポリシーによりブロックされます。
            </p>
            <p className="text-xs text-amber-700 font-medium">
              Safari または Chrome でこのページを開いてください。
            </p>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ url: window.location.href })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('URLをコピーしました。Safariに貼り付けて開いてください。')
                }
              }}
              className="w-full bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700">
              URLをコピー / 共有
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.5 1 24 1 14.7 1 6.8 6.7 3.3 14.7l7 5.4C12 14.1 17.5 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
                <path fill="#FBBC05" d="M10.3 28.6A14.7 14.7 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.7-6.1z"/>
                <path fill="#34A853" d="M24 47c5.5 0 10.1-1.8 13.5-4.9l-7.5-5.8c-1.9 1.3-4.3 2-6 2-6.5 0-12-4.6-13.7-10.8l-7.7 6c3.5 8 11.4 13.5 20.9 13.5z"/>
              </svg>
              <span className="font-medium text-gray-700">
                {isLoggingIn ? 'ログイン中...' : 'Google でログイン'}
              </span>
            </button>

            {error && (
              <p className="text-red-500 text-xs text-center mt-3 whitespace-pre-line">{error}</p>
            )}

            <div className="mt-4 p-3 bg-dandy-50 rounded-lg text-xs text-dandy-700">
              ※ログイン後に「このアプリは確認されていません」の画面が出た場合は<br />
              「詳細」→「dandy shiftに移動（安全でないページ）」をクリックしてください
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              管理者アカウントのみログインできます
            </p>
          </>
        )}
      </div>
    </div>
  )
}
