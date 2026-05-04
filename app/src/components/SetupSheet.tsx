import { useState } from 'react'
import { Database, Plus, Link } from 'lucide-react'

interface Props {
  onCreateNew: () => Promise<void>
  onConnectExisting: (spreadsheetId: string) => Promise<void>
  isLoading: boolean
}

export function SetupSheet({ onCreateNew, onConnectExisting, isLoading }: Props) {
  const [mode, setMode] = useState<'choose' | 'connect'>('choose')
  const [sheetId, setSheetId] = useState('')
  const [error, setError] = useState('')

  const handleConnect = async () => {
    const id = sheetId.trim()
    if (!id) { setError('シートIDを入力してください'); return }
    try {
      setError('')
      await onConnectExisting(id)
    } catch {
      setError('シートに接続できませんでした。IDを確認してください。')
    }
  }

  const handleCreateNew = async () => {
    try {
      setError('')
      await onCreateNew()
    } catch {
      setError('シートの作成に失敗しました。')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dandy-50 to-dandy-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-dandy-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">データの保存先を設定</h1>
          <p className="text-sm text-gray-500 mt-1">Google スプレッドシートに接続します</p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={handleCreateNew}
              disabled={isLoading}
              className="w-full flex items-center gap-3 border-2 border-dandy-200 hover:border-dandy-400 hover:bg-dandy-50 rounded-xl p-4 text-left transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-dandy-100 rounded-lg flex items-center justify-center shrink-0">
                <Plus size={20} className="text-dandy-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">新しいシートを作成</p>
                <p className="text-xs text-gray-500">はじめて使う場合はこちら</p>
              </div>
            </button>

            <button
              onClick={() => setMode('connect')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl p-4 text-left transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Link size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">既存のシートに接続</p>
                <p className="text-xs text-gray-500">他の管理者からシートIDを教えてもらった場合</p>
              </div>
            </button>

            {isLoading && (
              <p className="text-center text-sm text-dandy-500 animate-pulse">シートを作成中...</p>
            )}
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          </div>
        )}

        {mode === 'connect' && (
          <div className="space-y-4">
            <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700">
              ← 戻る
            </button>
            <div>
              <label className="block text-sm font-medium mb-1">スプレッドシートID</label>
              <input
                type="text"
                value={sheetId}
                onChange={e => setSheetId(e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                シートのURLの /spreadsheets/d/<span className="font-bold">ここの部分</span>/edit
              </p>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full bg-dandy-500 hover:bg-dandy-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? '接続中...' : '接続する'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
