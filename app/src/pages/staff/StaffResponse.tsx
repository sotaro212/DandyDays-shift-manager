import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useStoreContext } from '@/store/StoreContext'
import { ShiftMonth, ShiftSlot, StaffResponse as StaffResponseType } from '@/types'
import { gasGet, gasPost } from '@/services/gasService'

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const STORAGE_KEY = 'staff_member_id'

// 回答履歴をlocalStorageに保存するキー（月ごと）
function responsesKey(monthId: string) {
  return `staff_responses_${monthId}`
}

function loadSavedResponses(monthId: string, memberId: string): StaffResponseType[] {
  try {
    const raw = localStorage.getItem(responsesKey(monthId))
    if (raw) {
      const parsed: StaffResponseType[] = JSON.parse(raw)
      return parsed.filter(r => r.memberId === memberId)
    }
  } catch {}
  return []
}

function saveResponses(monthId: string, responses: StaffResponseType[]) {
  try {
    localStorage.setItem(responsesKey(monthId), JSON.stringify(responses))
  } catch {}
}

interface GasShiftData {
  shiftMonth: ShiftMonth
  slots: ShiftSlot[]
  responses?: StaffResponseType[] // GASから既存回答を返す場合
}

export function StaffResponse() {
  const { monthId } = useParams<{ monthId: string }>()
  const [searchParams] = useSearchParams()
  const gasUrl = searchParams.get('gas')

  const { data, addMember, submitResponse } = useStoreContext()

  // GASモード用のローカル状態
  const [gasData, setGasData] = useState<GasShiftData | null>(null)
  const [localResponses, setLocalResponses] = useState<StaffResponseType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [memberId, setMemberId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // ローカルデータがあればそちらを使う（管理者デバイス）
  const localShiftMonth = data.shiftMonths.find(m => m.id === monthId)
  const isAdminMode = !!localShiftMonth

  const shiftMonth = localShiftMonth ?? gasData?.shiftMonth
  const slots = isAdminMode
    ? data.shiftSlots.filter(s => s.shiftMonthId === monthId).sort((a, b) => a.date.localeCompare(b.date))
    : (gasData?.slots ?? []).sort((a, b) => a.date.localeCompare(b.date))

  const member = isAdminMode
    ? data.members.find(m => m.id === memberId)
    : (memberId ? { id: memberId, name: localStorage.getItem('staff_name') ?? '' } : undefined)

  const myResponses = isAdminMode
    ? data.staffResponses.filter(r => r.memberId === memberId)
    : localResponses.filter(r => r.memberId === memberId)

  // 締め切りチェック
  const isClosed = !shiftMonth
    || shiftMonth.status === 'closed'
    || (shiftMonth.deadlineAt && new Date() > new Date(shiftMonth.deadlineAt))

  // スタッフモード：GASからシフトデータ取得
  useEffect(() => {
    if (isAdminMode) return
    if (!gasUrl) {
      setLoadError('URLが無効です。管理者から最新のURLを受け取ってください。')
      return
    }
    if (!monthId) return

    setIsLoading(true)
    setLoadError('')
    gasGet<GasShiftData>(gasUrl, { monthId })
      .then(res => {
        if (!res || !res.shiftMonth) throw new Error('データが見つかりません')
        setGasData(res)
        // GASが既存回答を返してくれる場合はそちらを使う
        if (res.responses && res.responses.length > 0 && memberId) {
          const myGasResponses = res.responses.filter(r => r.memberId === memberId)
          if (myGasResponses.length > 0) {
            setLocalResponses(myGasResponses)
            saveResponses(monthId, myGasResponses)
            return
          }
        }
        // localStorage から過去回答を復元
        if (memberId) {
          const saved = loadSavedResponses(monthId, memberId)
          if (saved.length > 0) setLocalResponses(saved)
        }
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'データの読み込みに失敗しました'))
      .finally(() => setIsLoading(false))
  }, [isAdminMode, gasUrl, monthId, memberId])

  // メンバーIDが変わったとき有効性チェック（管理者モード）
  useEffect(() => {
    if (!isAdminMode) return
    if (memberId && !data.members.find(m => m.id === memberId)) {
      setMemberId(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [isAdminMode, memberId, data.members])

  // memberIdが設定されたらlocalStorageの過去回答を読み込む（スタッフモード）
  useEffect(() => {
    if (isAdminMode || !memberId || !monthId) return
    const saved = loadSavedResponses(monthId, memberId)
    if (saved.length > 0) {
      setLocalResponses(saved)
    }
  }, [memberId, isAdminMode, monthId])

  const handleRegister = async () => {
    if (!name.trim() || !email.trim()) { setRegError('名前とメールは必須です'); return }
    setRegLoading(true)
    setRegError('')
    try {
      if (isAdminMode) {
        const existing = data.members.find(m => m.email === email.trim())
        if (existing) {
          setMemberId(existing.id)
          localStorage.setItem(STORAGE_KEY, existing.id)
        } else {
          const newMember = addMember({ name: name.trim(), email: email.trim(), city: city.trim() })
          setMemberId(newMember.id)
          localStorage.setItem(STORAGE_KEY, newMember.id)
        }
      } else if (gasUrl) {
        const newId = crypto.randomUUID()
        const memberData = {
          id: newId, name: name.trim(), email: email.trim(), city: city.trim(),
          role: 'user', createdAt: new Date().toISOString(), lastAccessedAt: new Date().toISOString(),
        }
        const res = await gasPost<{ member: { id: string } }>(gasUrl, { action: 'addMember', ...memberData })
        const id = res.member?.id ?? newId
        setMemberId(id)
        localStorage.setItem(STORAGE_KEY, id)
        localStorage.setItem('staff_name', name.trim())
        // 登録後、localStorageの過去回答を読み込む
        if (monthId) {
          const saved = loadSavedResponses(monthId, id)
          if (saved.length > 0) setLocalResponses(saved)
        }
      }
    } catch (e) {
      setRegError(e instanceof Error ? e.message : '登録に失敗しました')
    } finally {
      setRegLoading(false)
    }
  }

  const handleToggle = async (slotId: string) => {
    if (!memberId || isClosed) return
    const existing = myResponses.find(r => r.shiftSlotId === slotId)
    const newIsAvailable = !existing?.isAvailable

    if (isAdminMode) {
      submitResponse(slotId, memberId, newIsAvailable)
    } else if (gasUrl) {
      const newResp: StaffResponseType = {
        // 既存のIDを再利用することで、GAS側で同じ行を上書きできる
        id: existing?.id ?? crypto.randomUUID(),
        shiftSlotId: slotId,
        memberId,
        isAvailable: newIsAvailable,
        submittedAt: new Date().toISOString(),
        isAssigned: false,
      }
      // 楽観的更新 + localStorageに保存（ページリロード後も履歴を保持）
      setLocalResponses(prev => {
        const updated = [
          ...prev.filter(r => !(r.shiftSlotId === slotId && r.memberId === memberId)),
          newResp,
        ]
        if (monthId) saveResponses(monthId, updated)
        return updated
      })
      // GASにPOST（upsert: 同じIDの行があれば上書き）
      gasPost(gasUrl, { action: 'submitResponse', ...newResp }).catch(() => {})
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  // ─── ローディング ────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
          <p className="text-gray-500 text-sm">シフトデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  // ─── エラー ───────────────────────────────────
  if (loadError) {
    const isGasError = loadError.includes('GAS') || loadError.includes('認証') || loadError.includes('SPREADSHEET')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-6 max-w-sm w-full space-y-4">
          <div className="text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">読み込みエラー</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-red-600 text-xs whitespace-pre-wrap">{loadError}</p>
          </div>
          {isGasError && (
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">GAS設定チェックリスト</p>
              <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                <li>script.google.com を開く</li>
                <li>「デプロイ」→「デプロイを管理」</li>
                <li>「アクセスできるユーザー」が<strong>「全員」</strong>か確認</li>
                <li>Code.gs の <code className="bg-amber-100 px-1">SPREADSHEET_ID</code> が設定済みか確認</li>
                <li>変更した場合は「新しいバージョン」で再デプロイ</li>
              </ol>
            </div>
          )}
          <button onClick={() => window.location.reload()}
            className="w-full border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // ─── 未存在 ───────────────────────────────────
  if (!shiftMonth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <p className="text-gray-500">このシフト表は存在しません</p>
        </div>
      </div>
    )
  }

  // ─── 締め切り ─────────────────────────────────
  if (isClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <XCircle size={40} className="text-gray-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">このシフトの募集は終了しました</p>
          <p className="text-sm text-gray-400 mt-1">{shiftMonth.year}年{shiftMonth.month}月のシフト</p>
        </div>
      </div>
    )
  }

  // ─── 未登録 → 登録フォーム ────────────────────
  if (!memberId || (!isAdminMode && !localStorage.getItem('staff_name'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">📅</span>
            </div>
            <h1 className="font-bold text-gray-800">{shiftMonth.year}年{shiftMonth.month}月 シフト希望</h1>
            <p className="text-sm text-gray-500 mt-1">はじめに情報を登録してください</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">名前 *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="田中 花子"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">メールアドレス *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="hanako@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">住所（市区町村）</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder="横浜市"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-amber-600 mt-1 bg-amber-50 rounded px-2 py-1">
                ⚠️ 横浜市・葛飾区 など<span className="font-medium">市区町村まで</span>ご入力ください
              </p>
            </div>
            {regError && <p className="text-red-500 text-xs">{regError}</p>}
            <button onClick={handleRegister} disabled={regLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {regLoading && <Loader2 size={14} className="animate-spin" />}
              登録してシフトを見る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── メイン画面 ───────────────────────────────
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, typeof slots>)

  const selectedCount = myResponses.filter(r => r.isAvailable).length
  const displayName = isAdminMode ? member?.name : localStorage.getItem('staff_name') ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-4 py-3">
        <h1 className="font-bold">{shiftMonth.year}年{shiftMonth.month}月 シフト希望</h1>
        <p className="text-sm text-blue-200">こんにちは、{displayName}さん</p>
        {shiftMonth.deadlineAt && (
          <p className="text-xs text-blue-200 mt-0.5">
            締切: {format(new Date(shiftMonth.deadlineAt), 'M/d(E) HH:mm', { locale: ja })}
          </p>
        )}
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-28">
        <p className="text-sm text-gray-600">参加できる日付・場所をタップして選択してください</p>
        {selectedCount > 0 && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            前回の回答が読み込まれています。変更がある場合はタップしてください。
          </p>
        )}

        {Object.entries(slotsByDate).map(([date, daySlots]) => {
          const d = parseISO(date)
          return (
            <div key={date} className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <span className="font-medium text-sm text-gray-700">
                  {format(d, 'M月d日', { locale: ja })}
                  <span className={`ml-1 ${d.getDay() === 0 ? 'text-red-500' : d.getDay() === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                    ({DOW[d.getDay()]})
                  </span>
                </span>
              </div>
              <div className="divide-y">
                {daySlots.map(slot => {
                  const resp = myResponses.find(r => r.shiftSlotId === slot.id)
                  const isSelected = resp?.isAvailable === true
                  return (
                    <button key={slot.id} onClick={() => handleToggle(slot.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors
                        ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div>
                        <p className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {slot.locationName}
                        </p>
                        <p className="text-xs text-gray-400">
                          必要: {slot.requiredCount}名
                          {slot.note && <> ・ {slot.note}</>}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                        ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                        {isSelected && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="text-sm text-gray-600">{selectedCount}枠選択中</span>
          <button onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors">
            {submitted ? '✓ 回答を保存しました' : '回答を確定する'}
          </button>
        </div>
      </div>
    </div>
  )
}
