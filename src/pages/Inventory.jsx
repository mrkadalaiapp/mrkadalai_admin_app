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

export default function Inventory() {
  const outletId = parseInt(localStorage.getItem('outletId'))
  const [tab, setTab] = useState('stock')

  const [items,       setItems]       = useState([])
  const [history,     setHistory]     = useState([])
  const [todayHist,   setTodayHist]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [histLoading, setHistLoading] = useState(false)
  const [todayLoading,setTodayLoading]= useState(false)

  const [categories, setCategories] = useState([])

  // ── Current Stock filters
  const [search,     setSearch]    = useState('')
  const [catFilter,  setCatFilter] = useState('All')
  const [statusFilter,setStatusFilter] = useState('All')

  // ── Master filters
  const [masterSearch, setMasterSearch] = useState('')
  const [masterSelectedItems, setMasterSelectedItems] = useState([])
  const [showItemsMaster, setShowItemsMaster] = useState(false)

  // ── History filters
  const [dateFrom, setDateFrom] = useState(weekAgo())
  const [dateTo,   setDateTo]   = useState(today())
  const [histSources, setHistSources] = useState([])
  const [histItems,   setHistItems]   = useState([])
  const [histMove,    setHistMove]    = useState('All')

  // ── Today filters
  const [todayItems,     setTodayItems]     = useState([])
  const [todayMove,      setTodayMove]      = useState('All')
  const [todaySources,   setTodaySources]   = useState([])

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
        ...(histSources.length > 0 ? { source: histSources } : {}),
        ...(histItems.length > 0 ? { inventoryItemId: histItems.map(i => i.id) } : {}),
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
        ...(todayItems.length > 0 ? { inventoryItemId: todayItems.map(i => i.id) } : {}),
        ...(todaySources.length > 0 ? { source: todaySources } : {}),
      }
      const res = await apiRequest('/superadmin/outlets/inventory-items/history', { method:'POST', body:payload })
      setTodayHist(res.history || [])
    } catch { toast.error('Failed to load today\'s history') }
    finally { setTodayLoading(false) }
  }

  const switchTab = (key) => {
    setTab(key)
    if (key === 'history') fetchHistory()
    if (key === 'today')   fetchTodayHistory()
  }

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

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = items.filter(i => {
    const matchCat    = catFilter    === 'All' || i.itemCategory === catFilter
    const matchStatus = statusFilter === 'All' || i.stockStatus  === statusFilter
    const matchSearch = i.itemName.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchStatus && matchSearch
  })

  const masterFiltered = items.filter(i => {
    const matchSearch = i.itemName.toLowerCase().includes(masterSearch.toLowerCase())
    const matchSelected = masterSelectedItems.length === 0 || masterSelectedItems.some(s => s.id === i.id)
    return matchSearch && matchSelected
  })

  const counts = { HEALTHY:0, LOW_STOCK:0, OUT_OF_STOCK:0 }
  items.forEach(i => { if (counts[i.stockStatus] !== undefined) counts[i.stockStatus]++ })

  const filteredHistory = history.filter(r => histMove === 'All' || r.movementType === histMove)
  const filteredToday = todayHist.filter(r => todayMove === 'All' || r.movementType === todayMove)

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

  // ── Autocomplete / Multi-select UI Helpers ───────────────────────────────
  const [showSrcHist, setShowSrcHist] = useState(false)
  const [showSrcToday, setShowSrcToday] = useState(false)
  const [itemSearchHist, setItemSearchHist] = useState('')
  const [itemSearchToday, setItemSearchToday] = useState('')
  const [showItemsHist, setShowItemsHist] = useState(false)
  const [showItemsToday, setShowItemsToday] = useState(false)

  const MultiSelect = ({ label, selected, options, onToggle, show, setShow, onClear }) => (
    <div className="relative">
      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
      <button onClick={() => setShow(!show)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px] text-left bg-white flex justify-between items-center shadow-sm">
        <span className="truncate">{selected.length === 0 ? `All ${label}` : `${selected.length} selected`}</span>
        <span className="text-gray-400 text-[10px]">▼</span>
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShow(false)}></div>
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
            {options.filter(o => o !== 'All').map(o => (
              <label key={o} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-xs">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} className="rounded text-gray-900 focus:ring-gray-900 h-3.5 w-3.5" />
                {o.replace(/_/g, ' ')}
              </label>
            ))}
            <div className="border-t pt-1.5 mt-1 flex justify-between px-1">
              <button onClick={onClear} className="text-[10px] text-blue-600 font-bold uppercase hover:underline">Clear</button>
              <button onClick={() => setShow(false)} className="text-[10px] text-gray-600 font-bold uppercase hover:underline">Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  )

  const Autocomplete = ({ label, selected, setSelected, searchVal, setSearchVal, show, setShow }) => {
    const suggestions = items.filter(i => 
      i.itemName.toLowerCase().includes(searchVal.toLowerCase()) && 
      !selected.find(s => s.id === i.id)
    )
    return (
      <div className="relative flex-1 min-w-[240px]">
        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
        <div className="border border-gray-300 rounded-lg p-1 bg-white flex flex-wrap gap-1 min-h-[38px] items-center shadow-sm">
          {selected.map(item => (
            <span key={item.id} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex items-center gap-1 text-[11px] font-medium border border-gray-200">
              {item.itemName}
              <button onClick={() => setSelected(selected.filter(i => i.id !== item.id))} className="hover:text-red-500 ml-0.5 text-[10px]">✕</button>
            </span>
          ))}
          <input value={searchVal} onChange={e => setSearchVal(e.target.value)} onFocus={() => setShow(true)} placeholder={selected.length === 0 ? "Search & select items..." : ""} className="flex-1 outline-none px-2 py-1 text-sm bg-transparent min-w-[120px]" />
        </div>
        {show && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShow(false)}></div>
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map(s => (
                  <button key={s.id} onClick={() => { setSelected([...selected, s]); setSearchVal(''); setShow(false) }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex justify-between border-b last:border-0 border-gray-50">
                    <span className="font-medium text-gray-700">{s.itemName}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">{s.itemCategory}</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-gray-400 italic">No items found</div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Tab Navigation Helpers ────────────────────────────────────────────────
  const TabBtn = ({ k, label }) => (
    <button onClick={() => switchTab(k)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        tab === k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {label}
    </button>
  )

  const ExportBtn = ({ rows, filename }) => (
    <button onClick={() => exportCSV(rows, HISTORY_COLS, filename)}
      className="flex items-center gap-1.5 border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
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
        <button onClick={openAdd} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all shadow-sm active:scale-95">
          <span className="text-lg leading-none">+</span> Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {tab === 'today' ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Total IN Today</p>
              <p className="text-2xl font-black text-green-700 mt-1">{totalIn.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Total OUT Today</p>
              <p className="text-2xl font-black text-red-700 mt-1">{totalOut.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Movements</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{filteredToday.length}</p>
            </div>
          </>
        ) : (
          [
            { label:'Healthy',      count:counts.HEALTHY,      color:'bg-green-50 border-green-200',   textColor:'text-green-700',  key:'HEALTHY' },
            { label:'Low Stock',    count:counts.LOW_STOCK,    color:'bg-yellow-50 border-yellow-200', textColor:'text-yellow-700', key:'LOW_STOCK' },
            { label:'Out of Stock', count:counts.OUT_OF_STOCK, color:'bg-red-50 border-red-200',       textColor:'text-red-700',    key:'OUT_OF_STOCK' },
          ].map(card => (
            <button key={card.label}
              onClick={() => { setStatusFilter(s => s === card.key ? 'All' : card.key); setTab('stock') }}
              className={`border rounded-xl p-4 text-left transition-all shadow-sm ${card.color} ${statusFilter === card.key ? 'ring-2 ring-gray-400' : 'hover:scale-[1.02]'}`}>
              <p className={`text-2xl font-black ${card.textColor}`}>{card.count}</p>
              <p className="text-xs font-bold text-gray-600 mt-0.5 uppercase tracking-wide">{card.label}</p>
            </button>
          ))
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search current items..." className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none shadow-sm" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none shadow-sm bg-white">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              {[...new Set(items.map(i => i.itemCategory))].filter(cat => !categories.some(c => c.name === cat)).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none shadow-sm bg-white">
              <option value="All">All Status</option>
              <option value="HEALTHY">Healthy</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item Name','Category','Current Stock','Threshold','Cost/Unit','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 text-[10px] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(item => {
                  const sc = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.HEALTHY
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${getCatColor(item.itemCategory, categories)}`}>{item.itemCategory}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{item.currentStock} <span className="text-gray-400 font-normal text-xs">{item.stockUnit}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-medium">{item.reorderThreshold} {item.stockUnit}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-medium">₹{item.costPerUnit.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openAdj(item,'add')}    className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-black hover:bg-green-700 active:scale-95 transition-all shadow-sm">ADD</button>
                          <button onClick={() => openAdj(item,'deduct')} className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-black hover:bg-red-700 active:scale-95 transition-all shadow-sm">DEDUCT</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="p-12 text-center text-gray-400 italic">No matching items in stock</div>}
          </div>
        </div>
      )}

      {/* ── Tab: Item Master ────────────────────────────────────────────────── */}
      {tab === 'master' && (
        <div className="space-y-4">
          <div className="flex gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
            <Autocomplete 
              label="Search & Filter Items" 
              selected={masterSelectedItems} 
              setSelected={setMasterSelectedItems} 
              searchVal={masterSearch} 
              setSearchVal={setMasterSearch} 
              show={showItemsMaster} 
              setShow={setShowItemsMaster} 
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item Name','Category','Unit','Threshold','Cost/Unit','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 text-[10px] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {masterFiltered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${getCatColor(item.itemCategory, categories)}`}>{item.itemCategory}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium uppercase">{item.stockUnit}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium">{item.reorderThreshold}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium">₹{item.costPerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)}    className="border border-gray-300 px-3 py-1 rounded text-[10px] font-black hover:bg-gray-50 active:scale-95 transition-all">EDIT</button>
                        <button onClick={() => softDelete(item)}  className="border border-red-200 text-red-600 px-3 py-1 rounded text-[10px] font-black hover:bg-red-50 active:scale-95 transition-all">REMOVE</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {masterFiltered.length === 0 && <div className="p-12 text-center text-gray-400 italic">No master items match your search</div>}
          </div>
        </div>
      )}

      {/* ── Tab: Today's Stock ──────────────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">📦 Movement Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.values(todaySummary).map(s => (
                <div key={s.name} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-800 truncate">{s.name}</p>
                  <div className="flex gap-3 mt-1.5">
                    {s.inQty  > 0 && <span className="text-[10px] font-black text-green-700">▲ {s.inQty.toFixed(2)}</span>}
                    {s.outQty > 0 && <span className="text-[10px] font-black text-red-700">▼ {s.outQty.toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 flex-wrap items-end bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
            <select value={todayMove} onChange={e => setTodayMove(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none shadow-sm bg-white h-[38px] min-w-[140px]">
              <option value="All">All Movements</option>
              <option value="INWARD">▲ Stock IN</option>
              <option value="OUTWARD">▼ Stock OUT</option>
            </select>
            <MultiSelect label="Sources" selected={todaySources} options={SOURCES} onToggle={s => setTodaySources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} show={showSrcToday} setShow={setShowSrcToday} onClear={() => setTodaySources([])} />
            <Autocomplete label="Items" selected={todayItems} setSelected={setTodayItems} searchVal={itemSearchToday} setSearchVal={setItemSearchToday} show={showItemsToday} setShow={setShowItemsToday} />
            <div className="flex gap-2">
              <button onClick={fetchTodayHistory} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all h-[38px]">Apply</button>
              <ExportBtn rows={filteredToday} filename={`stock-today-${today()}.csv`} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Time','Item','Movement','Qty','Source','Remarks'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 text-[10px] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredToday.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs font-medium">
                      {new Date(row.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {row.inventoryItem?.itemName}
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{row.inventoryItem?.itemCategory}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight ${row.movementType === 'INWARD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {row.movementType === 'INWARD' ? '▲ IN' : '▼ OUT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.quantity} <span className="text-gray-400 text-[10px] font-normal uppercase">{row.unit}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium">{row.source?.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]" title={row.remarks}>{row.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredToday.length === 0 && <div className="p-12 text-center text-gray-400 italic">No movements recorded today</div>}
          </div>
        </div>
      )}

      {/* ── Tab: Stock History ──────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex gap-4 flex-wrap items-end">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none h-[38px] shadow-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none h-[38px] shadow-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Movement</label>
              <select value={histMove} onChange={e => setHistMove(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none h-[38px] shadow-sm bg-white min-w-[120px]">
                <option value="All">All</option>
                <option value="INWARD">▲ IN</option>
                <option value="OUTWARD">▼ OUT</option>
              </select>
            </div>
            <MultiSelect label="Sources" selected={histSources} options={SOURCES} onToggle={s => setHistSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} show={showSrcHist} setShow={setShowSrcHist} onClear={() => setHistSources([])} />
            <Autocomplete label="Items" selected={histItems} setSelected={setHistItems} searchVal={itemSearchHist} setSearchVal={setItemSearchHist} show={showItemsHist} setShow={setShowItemsHist} />
            <div className="flex gap-2">
              <button onClick={fetchHistory} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all h-[38px]">Apply</button>
              <ExportBtn rows={filteredHistory} filename={`stock-history-${dateFrom}-to-${dateTo}.csv`} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date','Item','Movement','Qty','Source','Reference','Remarks'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 text-[10px] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs font-medium">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {row.inventoryItem?.itemName}
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{row.inventoryItem?.itemCategory}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight ${row.movementType === 'INWARD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {row.movementType === 'INWARD' ? '▲ IN' : '▼ OUT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.quantity} <span className="text-gray-400 text-[10px] font-normal uppercase">{row.unit}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium">{row.source?.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-gray-400 text-[10px] font-mono">{row.referenceId || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[150px]" title={row.remarks}>{row.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredHistory.length === 0 && <div className="p-12 text-center text-gray-400 italic">No history records found for your filters</div>}
          </div>
        </div>
      )}

      {/* ── Stock Adjustment Modal ──────────────────────────────────────────── */}
      {adjModal && adjItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h2 className="font-bold text-gray-900 uppercase tracking-tight">{adjMode === 'add' ? '➕ Add Stock' : '➖ Deduct Stock'} — {adjItem.itemName}</h2>
              <button onClick={() => setAdjModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm flex justify-between items-center">
                <div>
                  <p className="text-blue-600 font-bold uppercase text-[10px] tracking-widest mb-1">Current Stock</p>
                  <p className="text-xl font-black text-blue-900">{adjItem.currentStock} <span className="text-sm font-normal opacity-70">{adjItem.stockUnit}</span></p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Quantity to {adjMode === 'add' ? 'Increase' : 'Decrease'} ({adjItem.stockUnit}) *</label>
                <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} min="0.001" step="0.001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-gray-900 outline-none shadow-sm"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{adjMode === 'deduct' ? 'Reason for Deduction *' : 'Internal Remarks'}</label>
                <textarea value={adjReason} onChange={e => setAdjReason(e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 outline-none shadow-sm"
                  placeholder={adjMode === 'deduct' ? "e.g. Spillage, item expired..." : "Optional notes..."} />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setAdjModal(false)} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">CANCEL</button>
              <button onClick={submitAdj} disabled={adjLoading}
                className={`flex-1 py-3 rounded-xl text-sm font-black text-white transition-all shadow-lg active:scale-95 disabled:opacity-50
                  ${adjMode === 'add' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}>
                {adjLoading ? 'PROCESSING...' : adjMode === 'add' ? 'CONFIRM ADD' : 'CONFIRM DEDUCT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Master Modal ───────────────────────────────────────────────── */}
      {masterModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h2 className="font-bold text-gray-900 uppercase tracking-tight">{editingItem ? 'Edit Item' : 'New Inventory Item'}</h2>
              <button onClick={() => setMasterModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Item Name *</label>
                <input value={form.itemName} onChange={e => setForm(f => ({...f, itemName: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none shadow-sm font-medium"
                  placeholder="e.g. Onion, Aluminium Foil..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Category *</label>
                  <select value={form.itemCategory} onChange={e => setForm(f => ({...f, itemCategory: e.target.value}))} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none shadow-sm font-medium bg-white">
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Unit *</label>
                  <select value={form.stockUnit} onChange={e => setForm(f => ({...f, stockUnit: e.target.value}))} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none shadow-sm font-medium bg-white">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Reorder Threshold</label>
                  <input type="number" value={form.reorderThreshold} onChange={e => setForm(f => ({...f, reorderThreshold: e.target.value}))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none shadow-sm" placeholder="0" min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cost per Unit (₹)</label>
                  <input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({...f, costPerUnit: e.target.value}))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none shadow-sm" placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setMasterModal(false)} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">CANCEL</button>
              <button onClick={submitMaster} disabled={formLoading} className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-black shadow-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
                {formLoading ? 'SAVING...' : editingItem ? 'SAVE CHANGES' : 'CREATE ITEM'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}