import React, { useState, useEffect } from 'react'
import { apiRequest } from '../utils/api'
import { toast } from 'react-hot-toast'

// ── Category color palette (dynamic) ──────────────────────────────────────────
const CAT_PALETTE = [
  'bg-green-100 text-green-700','bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700','bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700','bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700','bg-red-100 text-red-700',
]
const getCatColor = (name, catList) => {
  const i = catList.findIndex(c => c.name === name)
  return CAT_PALETTE[(i >= 0 ? i : 0) % CAT_PALETTE.length]
}

const STATUS_CONFIG = {
  HEALTHY:     { label: 'Healthy',      cls: 'bg-green-100 text-green-700 border-green-200' },
  LOW_STOCK:   { label: 'Low Stock',    cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  OUT_OF_STOCK:{ label: 'Out of Stock', cls: 'bg-red-100 text-red-700 border-red-200' },
}

const SOURCES = ['All','EXPENDITURE_ENTRY','MANUAL_ADD','APP_SALE','POS_SALE','MANUAL_DEDUCTION','CANCELLATION_REVERSAL']
const UNITS   = ['kg','g','litre','ml','pieces','packets','bottles','boxes']

const today   = () => new Date().toISOString().split('T')[0]
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

// ── CSV Export helper ─────────────────────────────────────────────────────────
const exportCSV = (rows, columns, filename) => {
  const header = columns.map(c => c.label).join(',')
  const body   = rows.map(r => columns.map(c => {
    const val = c.get(r)
    // Wrap in quotes and escape internal quotes
    return `"${String(val ?? '').replace(/"/g, '""')}"`
  }).join(','))
  const csv  = [header, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const HISTORY_COLS = [
  { label: 'Date & Time',   get: r => fmtDate(r.createdAt) },
  { label: 'Item',          get: r => r.inventoryItem?.itemName || '' },
  { label: 'Category',      get: r => r.inventoryItem?.itemCategory || '' },
  { label: 'Unit',          get: r => r.inventoryItem?.stockUnit || '' },
  { label: 'Movement',      get: r => r.movementType },
  { label: 'Quantity',      get: r => r.quantity },
  { label: 'Source',        get: r => r.source?.replace(/_/g,' ') || '' },
  { label: 'Reference',     get: r => r.referenceId || '' },
  { label: 'Remarks',       get: r => r.remarks || '' },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const outletId = parseInt(localStorage.getItem('outletId'))
  // tabs: stock | master | history | today
  const [tab, setTab] = useState('stock')

  const [items,       setItems]       = useState([])
  const [history,     setHistory]     = useState([])
  const [todayHist,   setTodayHist]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [histLoading, setHistLoading] = useState(false)
  const [todayLoading,setTodayLoading]= useState(false)

  // Dynamic categories
  const [categories, setCategories] = useState([])

  // ── Current Stock filters
  const [search,     setSearch]    = useState('')
  const [catFilter,  setCatFilter] = useState('All')
  const [statusFilter,setStatusFilter] = useState('All')  // NEW

  // ── History filters
  const [dateFrom, setDateFrom] = useState(weekAgo())
  const [dateTo,   setDateTo]   = useState(today())
  const [srcFilter, setSrcFilter] = useState('All')
  const [histItem,  setHistItem]  = useState('')
  const [histMove,  setHistMove]  = useState('All')       // NEW

  // ── Today filters
  const [todayItem,     setTodayItem]     = useState('')
  const [todayMove,     setTodayMove]     = useState('All')
  const [todaySrc,      setTodaySrc]      = useState('All')

  // Adjustment modal
  const [adjModal,   setAdjModal]   = useState(false)
  const [adjMode,    setAdjMode]    = useState('add')
  const [adjItem,    setAdjItem]    = useState(null)
  const [adjQty,     setAdjQty]     = useState('')
  const [adjReason,  setAdjReason]  = useState('')
  const [adjLoading, setAdjLoading] = useState(false)

  // Master modal
  const [masterModal,  setMasterModal]  = useState(false)
  const [editingItem,  setEditingItem]  = useState(null)
  const [form,         setForm]         = useState({ itemName:'', itemCategory:'', stockUnit:'kg', reorderThreshold:'', costPerUnit:'' })
  const [formLoading,  setFormLoading]  = useState(false)

  useEffect(() => {
    if (outletId) { fetchItems(); fetchCategories() }
  }, [outletId])

  const fetchCategories = async () => {
    try {
      const res = await apiRequest(`/superadmin/outlets/expense-categories/${outletId}`)
      setCategories((res.categories || []).filter(c => c.isStockAffecting))
    } catch {}
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await apiRequest(`/superadmin/outlets/inventory-items/${outletId}`)
      setItems(res.items || [])
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }

  const fetchHistory = async () => {
    setHistLoading(true)
    try {
      const payload = {
        outletId,
        startDate: dateFrom,
        endDate:   dateTo,
        ...(srcFilter !== 'All' ? { source: srcFilter } : {}),
        ...(histItem ? { inventoryItemId: parseInt(histItem) } : {}),
      }
      const res = await apiRequest('/superadmin/outlets/inventory-items/history', { method:'POST', body:payload })
      setHistory(res.history || [])
    } catch { toast.error('Failed to load history') }
    finally { setHistLoading(false) }
  }

  const fetchTodayHistory = async () => {
    setTodayLoading(true)
    try {
      const payload = {
        outletId,
        startDate: today(),
        endDate:   today(),
        ...(todayItem ? { inventoryItemId: parseInt(todayItem) } : {}),
        ...(todaySrc !== 'All' ? { source: todaySrc } : {}),
      }
      const res = await apiRequest('/superadmin/outlets/inventory-items/history', { method:'POST', body:payload })
      setTodayHist(res.history || [])
    } catch { toast.error('Failed to load today\'s history') }
    finally { setTodayLoading(false) }
  }

  // Auto-load when tab switches to history / today
  const switchTab = (key) => {
    setTab(key)
    if (key === 'history') fetchHistory()
    if (key === 'today')   fetchTodayHistory()
  }

  // ── Stock Adjustment ───────────────────────────────────────────────────────
  const openAdj = (item, mode) => {
    setAdjItem(item); setAdjMode(mode); setAdjQty(''); setAdjReason(''); setAdjModal(true)
  }
  const submitAdj = async () => {
    if (!adjQty || parseFloat(adjQty) <= 0) return toast.error('Enter a valid quantity')
    if (adjMode === 'deduct' && !adjReason) return toast.error('Reason is required for deduction')
    setAdjLoading(true)
    try {
      const endpoint = adjMode === 'add'
        ? '/superadmin/outlets/inventory-items/manual-add-stock'
        : '/superadmin/outlets/inventory-items/manual-deduct-stock'
      await apiRequest(endpoint, { method:'POST', body:{ inventoryItemId:adjItem.id, outletId, quantity:parseFloat(adjQty), remarks:adjReason, reason:adjReason } })
      toast.success(`Stock ${adjMode === 'add' ? 'added' : 'deducted'} successfully`)
      setAdjModal(false); fetchItems()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setAdjLoading(false) }
  }

  // ── Item Master CRUD ───────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingItem(null)
    setForm({ itemName:'', itemCategory: categories[0]?.name || '', stockUnit:'kg', reorderThreshold:'', costPerUnit:'' })
    setMasterModal(true)
  }
  const openEdit = (item) => {
    setEditingItem(item)
    setForm({ itemName:item.itemName, itemCategory:item.itemCategory, stockUnit:item.stockUnit, reorderThreshold:item.reorderThreshold, costPerUnit:item.costPerUnit })
    setMasterModal(true)
  }
  const submitMaster = async () => {
    if (!form.itemName) return toast.error('Item name is required')
    setFormLoading(true)
    try {
      if (editingItem) {
        await apiRequest(`/superadmin/outlets/inventory-items/${editingItem.id}`, { method:'PUT', body:form })
        toast.success('Item updated')
      } else {
        await apiRequest('/superadmin/outlets/inventory-items/', { method:'POST', body:{ ...form, outletId } })
        toast.success('Item created')
      }
      setMasterModal(false); fetchItems()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setFormLoading(false) }
  }
  const softDelete = async (item) => {
    if (!window.confirm(`Deactivate "${item.itemName}"?`)) return
    try { await apiRequest(`/superadmin/outlets/inventory-items/${item.id}`, { method:'DELETE' }); toast.success('Deactivated'); fetchItems() }
    catch { toast.error('Failed') }
  }

  // ── Derived / filtered ────────────────────────────────────────────────────
  const filtered = items.filter(i => {
    const matchCat    = catFilter    === 'All' || i.itemCategory === catFilter
    const matchStatus = statusFilter === 'All' || i.stockStatus  === statusFilter
    const matchSearch = i.itemName.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchStatus && matchSearch
  })

  const counts = { HEALTHY:0, LOW_STOCK:0, OUT_OF_STOCK:0 }
  items.forEach(i => { if (counts[i.stockStatus] !== undefined) counts[i.stockStatus]++ })

  // History filtered by movement type (client-side)
  const filteredHistory = history.filter(r => histMove === 'All' || r.movementType === histMove)

  // Today filtered by movement type (client-side)
  const filteredToday = todayHist.filter(r => todayMove === 'All' || r.movementType === todayMove)

  // Today summary per item
  const todaySummary = filteredToday.reduce((acc, r) => {
    const name = r.inventoryItem?.itemName || 'Unknown'
    const unit = r.inventoryItem?.stockUnit || ''
    if (!acc[name]) acc[name] = { name, unit, inQty:0, outQty:0 }
    if (r.movementType === 'INWARD')  acc[name].inQty  += r.quantity
    if (r.movementType === 'OUTWARD') acc[name].outQty += r.quantity
    return acc
  }, {})

  const totalIn  = filteredToday.filter(r => r.movementType === 'INWARD').reduce((s,r) => s + r.quantity, 0)
  const totalOut = filteredToday.filter(r => r.movementType === 'OUTWARD').reduce((s,r) => s + r.quantity, 0)

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  const TabBtn = ({ k, label }) => (
    <button onClick={() => switchTab(k)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        tab === k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {label}
    </button>
  )

  const ExportBtn = ({ rows, filename }) => (
    <button
      onClick={() => exportCSV(rows, HISTORY_COLS, filename)}
      className="flex items-center gap-1.5 border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
      ⬇ Export CSV
    </button>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Raw materials, packaging &amp; serving items</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
          <span className="text-lg leading-none">+</span> Add Item
        </button>
      </div>

      {/* Summary Cards — context-aware */}
      <div className="grid grid-cols-3 gap-4">
        {tab === 'today' ? (
          // Today's Stock summary
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total IN Today</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{totalIn.toFixed(2)}</p>
              <p className="text-xs text-green-500 mt-0.5">{filteredToday.filter(r => r.movementType==='INWARD').length} movements</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total OUT Today</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{totalOut.toFixed(2)}</p>
              <p className="text-xs text-red-500 mt-0.5">{filteredToday.filter(r => r.movementType==='OUTWARD').length} movements</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Movements</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{filteredToday.length}</p>
              <p className="text-xs text-blue-500 mt-0.5">
                {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
              </p>
            </div>
          </>
        ) : (
          // Stock status summary
          [
            { label:'Healthy',      count:counts.HEALTHY,      color:'bg-green-50 border-green-200',   textColor:'text-green-700',  key:'HEALTHY' },
            { label:'Low Stock',    count:counts.LOW_STOCK,    color:'bg-yellow-50 border-yellow-200', textColor:'text-yellow-700', key:'LOW_STOCK' },
            { label:'Out of Stock', count:counts.OUT_OF_STOCK, color:'bg-red-50 border-red-200',       textColor:'text-red-700',    key:'OUT_OF_STOCK' },
          ].map(card => (
            <button key={card.label}
              onClick={() => { setStatusFilter(s => s === card.key ? 'All' : card.key); setTab('stock') }}
              className={`border rounded-xl p-4 text-left transition-all ${card.color} ${statusFilter === card.key ? 'ring-2 ring-gray-400' : 'hover:shadow-sm'}`}>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.count}</p>
              <p className="text-sm text-gray-600 mt-0.5">{card.label}</p>
              {statusFilter === card.key && <p className="text-xs text-gray-500 mt-1">Click to clear filter</p>}
            </button>
          ))
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          <TabBtn k="stock"   label="Current Stock" />
          <TabBtn k="master"  label="Item Master" />
          <TabBtn k="today"   label="Today's Stock" />
          <TabBtn k="history" label="Stock History" />
        </nav>
      </div>

      {/* ── Tab: Current Stock ──────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              {[...new Set(items.map(i => i.itemCategory))].filter(cat => !categories.some(c => c.name === cat)).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="All">All Status</option>
              <option value="HEALTHY">Healthy</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <button onClick={fetchItems} className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No inventory items found</p>
              <p className="text-sm mt-1">Add items using the "Add Item" button or go to Item Master tab</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Item Name','Category','Current Stock','Threshold','Cost/Unit','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item => {
                    const sc = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.HEALTHY
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCatColor(item.itemCategory, categories)}`}>{item.itemCategory}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{item.currentStock} <span className="text-gray-400 font-normal text-xs">{item.stockUnit}</span></td>
                        <td className="px-4 py-3 text-gray-500">{item.reorderThreshold} {item.stockUnit}</td>
                        <td className="px-4 py-3 text-gray-500">₹{item.costPerUnit.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openAdj(item,'add')}    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">+ Add</button>
                            <button onClick={() => openAdj(item,'deduct')} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">- Deduct</button>
                            <button onClick={() => openEdit(item)}         className="border border-gray-300 px-3 py-1 rounded text-xs hover:bg-gray-50">Edit</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Item Master ────────────────────────────────────────────────── */}
      {tab === 'master' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item Name','Category','Unit','Threshold','Cost/Unit','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getCatColor(item.itemCategory, categories)}`}>{item.itemCategory}</span></td>
                    <td className="px-4 py-3 text-gray-500">{item.stockUnit}</td>
                    <td className="px-4 py-3 text-gray-500">{item.reorderThreshold}</td>
                    <td className="px-4 py-3 text-gray-500">₹{item.costPerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)}    className="border border-gray-300 px-3 py-1 rounded text-xs hover:bg-gray-50">Edit</button>
                        <button onClick={() => softDelete(item)}  className="border border-red-200 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-50">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-400">No items yet. Click "Add Item" to get started.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Today's Stock ──────────────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-4">

          {/* Per-item summary cards */}
          {Object.values(todaySummary).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">📦 Per-Item Summary</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.values(todaySummary).map(s => (
                  <div key={s.name} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>
                    <div className="flex gap-3 mt-1.5">
                      {s.inQty  > 0 && <span className="text-xs text-green-700">▲ {s.inQty.toFixed(2)} {s.unit}</span>}
                      {s.outQty > 0 && <span className="text-xs text-red-700">▼ {s.outQty.toFixed(2)} {s.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              <select value={todayMove} onChange={e => setTodayMove(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="All">All Movements</option>
                <option value="INWARD">▲ Stock IN</option>
                <option value="OUTWARD">▼ Stock OUT</option>
              </select>
              <select value={todayItem} onChange={e => setTodayItem(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">All Items</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
              </select>
              <select value={todaySrc} onChange={e => setTodaySrc(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {SOURCES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s.replace(/_/g,' ')}</option>)}
              </select>
              <button onClick={fetchTodayHistory} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Apply</button>
            </div>
            <ExportBtn rows={filteredToday} filename={`stock-today-${today()}.csv`} />
          </div>

          {/* Table */}
          {todayLoading ? (
            <div className="text-center py-12 text-gray-400">Loading today's movements...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Time','Item','Category','Movement','Qty','Source','Remarks'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredToday.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(row.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.inventoryItem?.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getCatColor(row.inventoryItem?.itemCategory, categories)}`}>
                          {row.inventoryItem?.itemCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.movementType === 'INWARD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.movementType === 'INWARD' ? '▲ IN' : '▼ OUT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{row.quantity} <span className="text-gray-400 text-xs font-normal">{row.unit}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.source?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.remarks || '—'}</td>
                    </tr>
                  ))}
                  {filteredToday.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">No stock movements recorded today</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Stock History ──────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end justify-between">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Movement</label>
                <select value={histMove} onChange={e => setHistMove(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="All">All</option>
                  <option value="INWARD">▲ IN</option>
                  <option value="OUTWARD">▼ OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Source</label>
                <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {SOURCES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Item</label>
                <select value={histItem} onChange={e => setHistItem(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">All Items</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                </select>
              </div>
              <button onClick={fetchHistory} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Apply</button>
            </div>
            <ExportBtn rows={filteredHistory} filename={`stock-history-${dateFrom}-to-${dateTo}.csv`} />
          </div>

          {histLoading ? (
            <div className="text-center py-12 text-gray-400">Loading history...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date','Item','Category','Movement','Qty','Source','Reference','Remarks'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(row.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.inventoryItem?.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getCatColor(row.inventoryItem?.itemCategory, categories)}`}>
                          {row.inventoryItem?.itemCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.movementType === 'INWARD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.movementType === 'INWARD' ? '▲ IN' : '▼ OUT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{row.quantity} <span className="text-gray-400 text-xs font-normal">{row.unit}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.source?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{row.referenceId || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.remarks || '—'}</td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No history found for selected filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Stock Adjustment Modal ──────────────────────────────────────────── */}
      {adjModal && adjItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-900">{adjMode === 'add' ? '➕ Add Stock' : '➖ Deduct Stock'} — {adjItem.itemName}</h2>
              <button onClick={() => setAdjModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Current Stock: </span>
                <span className="font-semibold">{adjItem.currentStock} {adjItem.stockUnit}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({adjItem.stockUnit}) *</label>
                <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} min="0.001" step="0.001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder={`Enter quantity in ${adjItem.stockUnit}`} />
              </div>
              {adjMode === 'deduct' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <input value={adjReason} onChange={e => setAdjReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="e.g. Spillage, Expiry, Testing..." />
                </div>
              )}
              {adjMode === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                  <input value={adjReason} onChange={e => setAdjReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Restock purchase..." />
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setAdjModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submitAdj} disabled={adjLoading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors ${adjMode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                {adjLoading ? 'Processing...' : adjMode === 'add' ? 'Add Stock' : 'Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Master Modal ───────────────────────────────────────────────── */}
      {masterModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Edit Item' : 'New Inventory Item'}</h2>
              <button onClick={() => setMasterModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input value={form.itemName} onChange={e => setForm(f => ({...f, itemName: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="e.g. Onion, Aluminium Foil..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select value={form.itemCategory} onChange={e => setForm(f => ({...f, itemCategory: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {categories.length > 0
                      ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                      : <option value="">No categories yet — add in Expenditure → Masters</option>
                    }
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Add stock-affecting expense categories first in Expenditure → Masters tab.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Unit *</label>
                  <select value={form.stockUnit} onChange={e => setForm(f => ({...f, stockUnit: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Threshold</label>
                  <input type="number" value={form.reorderThreshold} onChange={e => setForm(f => ({...f, reorderThreshold: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0" min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (₹)</label>
                  <input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({...f, costPerUnit: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setMasterModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submitMaster} disabled={formLoading} className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                {formLoading ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}