import React, { useState, useEffect } from 'react'
import { apiRequest } from '../utils/api'
import { toast } from 'react-hot-toast'

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'WALLET']

const today = () => new Date().toISOString().split('T')[0]
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

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

const EXPENSE_COLS = [
  { label: 'Date',        get: r => formatDate(r.expenseDate) },
  { label: 'Category',    get: r => r.category || '' },
  { label: 'Description', get: r => r.description || '' },
  { label: 'Quantity',    get: r => r.quantity ? `${r.quantity} ${r.unit || ''}` : '' },
  { label: 'Amount',      get: r => r.amount.toFixed(2) },
  { label: 'Method',      get: r => r.method || '' },
  { label: 'Paid To',     get: r => r.paidTo || '' },
  { label: 'Notes',       get: r => r.notes || '' },
]

const ExportBtn = ({ rows, filename }) => (
  <button onClick={() => exportCSV(rows, EXPENSE_COLS, filename)}
    className="flex items-center gap-1.5 border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
    ⬇ Export CSV
  </button>
)

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, emptyMessage }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const selectedOption = options.find(o => o.id === parseInt(value))
  
  useEffect(() => {
    if (selectedOption) setSearchTerm(selectedOption.name)
    else setSearchTerm('')
  }, [value, options])

  const filtered = options.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (option) => {
    onChange(option.id)
    setSearchTerm(option.name)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          if (!isOpen) setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
      />
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <div
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${parseInt(value) === opt.id ? 'bg-gray-50 font-semibold' : ''}`}
              >
                {opt.name} {opt.inventoryItem ? `(Inv: ${opt.inventoryItem.itemName})` : ''}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-400">{emptyMessage || 'No matches found'}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Expenditure() {
  const outletId = parseInt(localStorage.getItem('outletId'))
  const [tab, setTab] = useState('tracker') // tracker | add | masters

  // Tracker
  const [expenses, setExpenses] = useState([])
  const [dateFrom, setDateFrom] = useState(weekAgo())
  const [dateTo, setDateTo] = useState(today())
  const [trackLoading, setTrackLoading] = useState(false)

  // Masters data
  const [categories, setCategories] = useState([])
  const [expenseNames, setExpenseNames] = useState([])
  const [vendors, setVendors] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])

  // Add Expense form
  const [form, setForm] = useState({ expenseDate: today(), categoryId: '', expenseNameId: '', quantity: '', unit: '', unitPrice: '', method: 'CASH', vendorName: '', notes: '' })
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [filteredNames, setFilteredNames] = useState([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [addLoading, setAddLoading] = useState(false)
  const [billImage, setBillImage] = useState(null)   // File object
  const [vendorPanel, setVendorPanel] = useState(false) // Vendor quick-select panel
  const [billPreview, setBillPreview] = useState(null)  // View bill modal URL

  // Edit Expense form
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSelectedCategory, setEditSelectedCategory] = useState(null)
  const [editFilteredNames, setEditFilteredNames] = useState([])
  const [editTotalAmount, setEditTotalAmount] = useState(0)
  const [editLoading, setEditLoading] = useState(false)

  // Masters sub-tab
  const [masterTab, setMasterTab] = useState('category')
  const [catForm, setCatForm] = useState({ name: '', isStockAffecting: false })
  const [nameForm, setNameForm] = useState({ name: '', categoryId: '', linkedInventoryItemId: '' })
  const [vendorForm, setVendorForm] = useState({ name: '' })
  const [masterLoading, setMasterLoading] = useState(false)

  useEffect(() => { if (outletId) { fetchExpenses(); fetchMasterData() } }, [outletId])

  // Auto-calc total for Add form
  useEffect(() => {
    const q = parseFloat(form.quantity) || 0
    const p = parseFloat(form.unitPrice) || 0
    setTotalAmount(q && p ? (q * p).toFixed(2) : '')
  }, [form.quantity, form.unitPrice])

  // Auto-calc total for Edit form
  useEffect(() => {
    if (editingExpense) {
      const q = parseFloat(editForm.quantity) || 0
      const p = parseFloat(editForm.unitPrice) || 0
      setEditTotalAmount(q && p ? (q * p).toFixed(2) : editForm.amount)
    }
  }, [editForm.quantity, editForm.unitPrice, editingExpense])

  // Filter expense names when category changes
  useEffect(() => {
    if (form.categoryId) {
      const cat = categories.find(c => c.id === parseInt(form.categoryId))
      setSelectedCategory(cat || null)
      const names = expenseNames.filter(n => n.categoryId === parseInt(form.categoryId))
      setFilteredNames(names)
      setForm(f => ({ ...f, expenseNameId: f.expenseNameId || '' }))
    } else {
      setSelectedCategory(null)
      setFilteredNames([])
    }
  }, [form.categoryId, categories, expenseNames])

  // Filter expense names when edit category changes
  useEffect(() => {
    if (editForm.categoryId) {
      const cat = categories.find(c => c.id === parseInt(editForm.categoryId))
      setEditSelectedCategory(cat || null)
      const names = expenseNames.filter(n => n.categoryId === parseInt(editForm.categoryId))
      setEditFilteredNames(names)
    } else {
      setEditSelectedCategory(null)
      setEditFilteredNames([])
    }
  }, [editForm.categoryId, categories, expenseNames])

  const fetchMasterData = async () => {
    try {
      const [catRes, nameRes, vendorRes, invRes] = await Promise.all([
        apiRequest(`/superadmin/outlets/expense-categories/${outletId}`),
        apiRequest(`/superadmin/outlets/expense-names/${outletId}`),
        apiRequest(`/superadmin/outlets/vendors/${outletId}`),
        apiRequest(`/superadmin/outlets/inventory-items/${outletId}`),
      ])
      setCategories(catRes.categories || [])
      setExpenseNames(nameRes.names || [])
      setVendors(vendorRes.vendors || [])
      setInventoryItems(invRes.items || [])
    } catch (e) { console.error('Failed to load master data', e) }
  }

  const fetchExpenses = async () => {
    setTrackLoading(true)
    try {
      const res = await apiRequest('/superadmin/outlets/get-expense-by-date/', {
        method: 'POST', body: { outletId, from: dateFrom, to: dateTo }
      })
      setExpenses(res.expenses || [])
    } catch (e) { toast.error('Failed to load expenses') }
    finally { setTrackLoading(false) }
  }

  const submitExpense = async () => {
    if (!form.expenseDate || !form.method) return toast.error('Date and payment method are required')
    if (!form.categoryId) return toast.error('Category is required')
    if (!form.expenseNameId) return toast.error('Expense name is required')
    if (selectedCategory?.isStockAffecting && !form.quantity) return toast.error('Quantity is required for this category')
    if (!totalAmount && !form.unitPrice) return toast.error('Unit price is required')

    setAddLoading(true)
    try {
      const selectedName = filteredNames.find(n => n.id === parseInt(form.expenseNameId))

      // Use FormData to support optional bill image upload
      const fd = new FormData()
      fd.append('outletId', outletId)
      fd.append('expenseDate', form.expenseDate)
      fd.append('categoryId', parseInt(form.categoryId))
      fd.append('category', selectedCategory?.name || '')
      fd.append('expenseNameId', parseInt(form.expenseNameId))
      fd.append('description', selectedName?.name || '')
      if (form.quantity) fd.append('quantity', parseFloat(form.quantity))
      if (form.unit) fd.append('unit', form.unit)
      if (form.unitPrice) fd.append('unitPrice', parseFloat(form.unitPrice))
      fd.append('amount', totalAmount ? parseFloat(totalAmount) : parseFloat(form.unitPrice))
      fd.append('method', form.method)
      if (form.vendorName) fd.append('vendorName', form.vendorName)
      if (selectedName?.linkedInventoryItemId) fd.append('linkedInventoryItemId', selectedName.linkedInventoryItemId)
      if (billImage) fd.append('billImage', billImage)

      const token = localStorage.getItem('token')
      const apiBase = import.meta.env.VITE_API_URL || 'http://13.201.49.59:5500/api'
      const resp = await fetch(`${apiBase}/superadmin/outlets/add-expenses/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: fd,
      })
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.message || 'Failed') }

      toast.success('Expense added' + (selectedCategory?.isStockAffecting ? ' & stock updated' : ''))
      setForm({ expenseDate: today(), categoryId: '', expenseNameId: '', quantity: '', unit: '', unitPrice: '', method: 'CASH', vendorName: '' })
      setBillImage(null)
      setTotalAmount(0)
      fetchExpenses()
    } catch (e) { toast.error(e.message || 'Failed to add expense') }
    finally { setAddLoading(false) }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? Any linked inventory stock will be reverted.')) return
    try {
      await apiRequest(`/superadmin/outlets/delete-expense/${id}`, { method: 'DELETE' })
      toast.success('Expense deleted successfully')
      fetchExpenses()
    } catch (e) { toast.error(e.message || 'Failed to delete expense') }
  }

  const openEditModal = (exp) => {
    const cat = categories.find(c => c.name === exp.category)
    setEditForm({
      expenseDate: new Date(exp.expenseDate).toISOString().split('T')[0],
      categoryId: cat ? cat.id : '',
      expenseNameId: exp.expenseNameId || '',
      quantity: exp.quantity || '',
      unit: exp.unit || '',
      unitPrice: exp.unitPrice || '',
      amount: exp.amount || '',
      method: exp.method || 'CASH',
      vendorName: exp.vendorName || ''
    })
    setEditTotalAmount(exp.amount)
    setEditingExpense(exp)
  }

  const submitEditExpense = async () => {
    if (!editForm.expenseDate || !editForm.method) return toast.error('Date and payment method are required')
    
    setEditLoading(true)
    try {
      const selectedName = editFilteredNames.find(n => n.id === parseInt(editForm.expenseNameId))
      
      const payload = {
        expenseDate: editForm.expenseDate,
        categoryId: editForm.categoryId ? parseInt(editForm.categoryId) : undefined,
        category: editSelectedCategory?.name || editForm.category,
        expenseNameId: editForm.expenseNameId ? parseInt(editForm.expenseNameId) : undefined,
        description: selectedName?.name,
        quantity: editForm.quantity ? parseFloat(editForm.quantity) : undefined,
        unit: editForm.unit,
        unitPrice: editForm.unitPrice ? parseFloat(editForm.unitPrice) : undefined,
        amount: editTotalAmount ? parseFloat(editTotalAmount) : parseFloat(editForm.amount),
        method: editForm.method,
        vendorName: editForm.vendorName,
        linkedInventoryItemId: selectedName?.linkedInventoryItemId || undefined
      }

      await apiRequest(`/superadmin/outlets/update-expense/${editingExpense.id}`, {
        method: 'PUT',
        body: payload
      })

      toast.success('Expense updated successfully')
      setEditingExpense(null)
      fetchExpenses()
    } catch (e) { toast.error(e.message || 'Failed to update expense') }
    finally { setEditLoading(false) }
  }

  // Masters handlers
  const addCategory = async () => {
    if (!catForm.name) return toast.error('Name required')
    setMasterLoading(true)
    try {
      await apiRequest('/superadmin/outlets/expense-categories/', { method: 'POST', body: { outletId, ...catForm } })
      toast.success('Category added'); setCatForm({ name: '', isStockAffecting: false }); fetchMasterData()
    } catch (e) { toast.error(e.message || 'Failed') }
    finally { setMasterLoading(false) }
  }

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return
    try { await apiRequest(`/superadmin/outlets/expense-categories/${id}`, { method: 'DELETE' }); toast.success('Deleted'); fetchMasterData() }
    catch (e) { toast.error('Failed') }
  }

  const addExpenseName = async () => {
    if (!nameForm.name || !nameForm.categoryId) return toast.error('Name and category required')
    setMasterLoading(true)
    try {
      await apiRequest('/superadmin/outlets/expense-names/', { method: 'POST', body: { outletId, ...nameForm, categoryId: parseInt(nameForm.categoryId), linkedInventoryItemId: nameForm.linkedInventoryItemId ? parseInt(nameForm.linkedInventoryItemId) : null } })
      toast.success('Expense name added'); setNameForm({ name: '', categoryId: '', linkedInventoryItemId: '' }); fetchMasterData()
    } catch (e) { toast.error(e.message || 'Failed') }
    finally { setMasterLoading(false) }
  }

  const deleteExpenseName = async (id) => {
    if (!window.confirm('Delete this expense name?')) return
    try { await apiRequest(`/superadmin/outlets/expense-names/${id}`, { method: 'DELETE' }); toast.success('Deleted'); fetchMasterData() }
    catch (e) { toast.error('Failed') }
  }

  const addVendor = async () => {
    if (!vendorForm.name) return toast.error('Vendor name required')
    setMasterLoading(true)
    try {
      await apiRequest('/superadmin/outlets/vendors/', { method: 'POST', body: { outletId, ...vendorForm } })
      toast.success('Vendor added'); setVendorForm({ name: '' }); fetchMasterData()
    } catch (e) { toast.error(e.message || 'Failed') }
    finally { setMasterLoading(false) }
  }

  const deleteVendor = async (id) => {
    if (!window.confirm('Delete this vendor?')) return
    try { await apiRequest(`/superadmin/outlets/vendors/${id}`, { method: 'DELETE' }); toast.success('Deleted'); fetchMasterData() }
    catch (e) { toast.error('Failed') }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expenditure</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track expenses and manage inventory stock inward</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {[['tracker','Expense Tracker'],['add','Add Expense'],['masters','Masters']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Expense Tracker ───────────────────────────────────────────── */}
      {tab === 'tracker' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={fetchExpenses} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Apply</button>
            <ExportBtn rows={expenses} filename={`expenses-${dateFrom}-to-${dateTo}.csv`} />
          </div>

          {expenses.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-blue-700">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} found</span>
              <span className="font-bold text-blue-900">Total: ₹{totalExpenses.toFixed(2)}</span>
            </div>
          )}

          {trackLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date','Category','Description','Qty','Amount','Method','Paid To','Bill','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{exp.category}</span></td>
                      <td className="px-4 py-3 text-gray-900">{exp.description}</td>
                      <td className="px-4 py-3 text-gray-500">{exp.quantity ? `${exp.quantity} ${exp.unit || ''}` : '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{exp.amount.toFixed(2)}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{exp.method}</span></td>
                      <td className="px-4 py-3 text-gray-500">{exp.paidTo}</td>
                      <td className="px-4 py-3">
                        {exp.billUrl
                          ? <button onClick={() => setBillPreview(exp.billUrl)} className="text-blue-600 underline text-xs hover:text-blue-800">View Bill</button>
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => openEditModal(exp)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Edit</button>
                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No expenses found for selected period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Add Expense ───────────────────────────────────────────────── */}
      {tab === 'add' && (
        <div className="flex gap-6 items-start">
          {/* ── Main Form ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">New Expense Entry</h2>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.expenseDate} onChange={e => setForm(f=>({...f,expenseDate:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.categoryId} onChange={e => setForm(f=>({...f,categoryId:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">— Select Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.isStockAffecting ? ' 📦' : ''}</option>)}
              </select>
              {selectedCategory?.isStockAffecting && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">📦 Stock-affecting category — will update inventory automatically</p>
              )}
            </div>

            {/* Expense Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name *</label>
              <SearchableSelect 
                options={filteredNames}
                value={form.expenseNameId}
                onChange={(id) => setForm(f => ({ ...f, expenseNameId: id }))}
                placeholder={!form.categoryId ? "Select category first..." : "Type to search item (e.g. Onion, Oil)..."}
                disabled={!form.categoryId}
                emptyMessage={form.categoryId ? "No names found. Add them in Masters." : "Select category first."}
              />
              {form.categoryId && filteredNames.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">No names under this category. Add them in Masters tab.</p>
              )}
            </div>

            {/* Qty + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity {selectedCategory?.isStockAffecting && '*'}</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))} min="0.001" step="0.001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g. 10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit {selectedCategory?.isStockAffecting && '*'}</label>
                <select value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white">
                  <option value="">Select Unit</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="litre">litre</option>
                  <option value="ml">ml</option>
                  <option value="pieces">pieces</option>
                  <option value="packets">packets</option>
                  <option value="bottles">bottles</option>
                  <option value="boxes">boxes</option>
                </select>
              </div>
            </div>

            {/* Unit Price → Total */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{selectedCategory?.isStockAffecting ? 'Price per Unit (₹) *' : 'Amount (₹) *'}</label>
                <input type="number" value={form.unitPrice} onChange={e => setForm(f=>({...f,unitPrice:e.target.value}))} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="0.00" />
              </div>
              {selectedCategory?.isStockAffecting && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900">
                    {totalAmount ? `₹ ${totalAmount}` : '—'}
                  </div>
                </div>
              )}
            </div>

            {/* Payment & Vendor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select value={form.method} onChange={e => setForm(f=>({...f,method:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor / Paid To
                  <button type="button" onClick={() => setVendorPanel(v => !v)} className="ml-2 text-xs text-blue-600 underline">{vendorPanel ? 'Hide list' : 'Pick from list'}</button>
                </label>
                <input list="vendors-list" value={form.vendorName} onChange={e => setForm(f=>({...f,vendorName:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="Type or pick vendor..." />
                <datalist id="vendors-list">
                  {vendors.map(v => <option key={v.id} value={v.name} />)}
                </datalist>
              </div>
            </div>

            {/* Bill Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Image <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                {billImage ? (
                  <div className="flex items-center gap-3">
                    <img src={URL.createObjectURL(billImage)} alt="bill" className="w-12 h-12 object-cover rounded" />
                    <div className="text-left flex-1">
                      <p className="text-sm text-gray-700 font-medium truncate">{billImage.name}</p>
                      <p className="text-xs text-gray-400">{(billImage.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setBillImage(null)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <span className="text-2xl">🧾</span>
                    <p className="text-sm text-gray-500 mt-1">Click to attach bill image or PDF</p>
                    <p className="text-xs text-gray-400">Max 5MB</p>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setBillImage(e.target.files[0] || null)} />
                  </label>
                )}
              </div>
            </div>

            {/* Submit */}
            <button onClick={submitExpense} disabled={addLoading} className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
              {addLoading ? 'Saving...' : '+ Add Expense'}
            </button>
          </div>
          </div>

          {/* ── Vendor Side Panel ─────────────────────────────── */}
          {vendorPanel && (
            <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Vendors</h3>
                <button onClick={() => setVendorPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              {vendors.length === 0 ? (
                <p className="text-xs text-gray-400">No vendors yet. Add them in Masters tab.</p>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {vendors.map(v => (
                    <button key={v.id}
                      onClick={() => { setForm(f => ({...f, vendorName: v.name})); setVendorPanel(false) }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        form.vendorName === v.name ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'
                      }`}>
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Masters ───────────────────────────────────────────────────── */}
      {tab === 'masters' && (
        <div className="space-y-4">
          {/* Masters Sub-tabs */}
          <div className="flex gap-2">
            {[['category','Categories'],['name','Expense Names'],['vendor','Vendors']].map(([key,label]) => (
              <button key={key} onClick={() => setMasterTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${masterTab === key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Category Master */}
          {masterTab === 'category' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Add Category</h3>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category Name *</label>
                  <input value={catForm.name} onChange={e => setCatForm(f=>({...f,name:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g. Groceries, Utilities..." />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={catForm.isStockAffecting} onChange={e => setCatForm(f=>({...f,isStockAffecting:e.target.checked}))} className="w-4 h-4 accent-gray-900" />
                  <span className="text-sm text-gray-700">Stock-affecting category <span className="text-gray-400">(triggers inventory inward)</span></span>
                </label>
                <button onClick={addCategory} disabled={masterLoading} className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                  {masterLoading ? 'Adding...' : 'Add Category'}
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${c.isStockAffecting ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.isStockAffecting ? '📦 Stock' : 'Non-stock'}</span></td>
                        <td className="px-4 py-3 text-right"><button onClick={() => deleteCategory(c.id)} className="text-red-500 text-xs hover:text-red-700">Delete</button></td>
                      </tr>
                    ))}
                    {categories.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-gray-400">No categories yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense Name Master */}
          {masterTab === 'name' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Add Expense Name</h3>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category *</label>
                  <select value={nameForm.categoryId} onChange={e => setNameForm(f=>({...f,categoryId:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Select Category —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input value={nameForm.name} onChange={e => setNameForm(f=>({...f,name:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g. Onion Purchase, LPG Cylinder..." />
                </div>
                {nameForm.categoryId && categories.find(c => c.id === parseInt(nameForm.categoryId))?.isStockAffecting && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Link to Inventory Item</label>
                    <SearchableSelect 
                      options={inventoryItems.map(i => ({ id: i.id, name: `${i.itemName} (${i.stockUnit})` }))}
                      value={nameForm.linkedInventoryItemId}
                      onChange={(id) => setNameForm(f => ({ ...f, linkedInventoryItemId: id }))}
                      placeholder="Search inventory item..."
                    />
                  </div>
                )}
                <button onClick={addExpenseName} disabled={masterLoading} className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                  {masterLoading ? 'Adding...' : 'Add Name'}
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Linked Item</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenseNames.map(n => (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{n.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{n.category?.name}</td>
                        <td className="px-4 py-3 text-xs">{n.inventoryItem ? <span className="text-blue-600">{n.inventoryItem.itemName}</span> : <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => deleteExpenseName(n.id)} className="text-red-500 text-xs hover:text-red-700">Delete</button></td>
                      </tr>
                    ))}
                    {expenseNames.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">No expense names yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vendor Master */}
          {masterTab === 'vendor' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Add Vendor</h3>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vendor Name *</label>
                  <input value={vendorForm.name} onChange={e => setVendorForm(f=>({...f,name:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g. Sri Ram Traders..." />
                </div>
                <button onClick={addVendor} disabled={masterLoading} className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                  {masterLoading ? 'Adding...' : 'Add Vendor'}
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Vendor Name</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendors.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{v.name}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => deleteVendor(v.id)} className="text-red-500 text-xs hover:text-red-700">Delete</button></td>
                      </tr>
                    ))}
                    {vendors.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-gray-400">No vendors yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bill Preview Modal ──────────────────────────────────────────────── */}
      {billPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setBillPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Bill Image</h2>
              <div className="flex items-center gap-3">
                <a href={billPreview} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Open in new tab</a>
                <button onClick={() => setBillPreview(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[75vh]">
              {billPreview.toLowerCase().endsWith('.pdf')
                ? <iframe src={billPreview} className="w-full h-[60vh] rounded" title="Bill PDF" />
                : <img src={billPreview} alt="Bill" className="w-full rounded object-contain" />
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ──────────────────────────────────────────────── */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Edit Expense</h2>
              <button onClick={() => setEditingExpense(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={editForm.expenseDate} onChange={e => setEditForm(f=>({...f,expenseDate:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={editForm.method} onChange={e => setEditForm(f=>({...f,method:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={editForm.categoryId} onChange={e => setEditForm(f=>({...f,categoryId:e.target.value, expenseNameId: ''}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                  <option value="">— Select Category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.isStockAffecting ? ' 📦' : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
                <SearchableSelect 
                  options={editFilteredNames}
                  value={editForm.expenseNameId}
                  onChange={(id) => setEditForm(f => ({ ...f, expenseNameId: id }))}
                  placeholder="Search item..."
                  disabled={!editForm.categoryId}
                  emptyMessage={editForm.categoryId ? "No names found." : "Select category."}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" value={editForm.quantity} onChange={e => setEditForm(f=>({...f,quantity:e.target.value}))} min="0" step="0.001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" value={editForm.unit} onChange={e => setEditForm(f=>({...f,unit:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" placeholder="kg, litre, etc" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                  <input type="number" value={editForm.unitPrice} onChange={e => setEditForm(f=>({...f,unitPrice:e.target.value}))} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                  <input type="number" value={editTotalAmount} onChange={e => {setEditTotalAmount(e.target.value); setEditForm(f=>({...f,amount:e.target.value}))}} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Paid To</label>
                <input type="text" value={editForm.vendorName} onChange={e => setEditForm(f=>({...f,vendorName:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingExpense(null)} className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={submitEditExpense} disabled={editLoading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
