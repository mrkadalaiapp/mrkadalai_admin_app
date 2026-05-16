import React, { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { apiRequest } from '../utils/api'
import Loader from '../components/ui/Loader'

const Customer = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customersData, setCustomersData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const outletId = localStorage.getItem('outletId');

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiRequest(`/superadmin/outlets/customers/${outletId}/`)

      console.log('API Response:', response)

      const transformedCustomers = response.customers.map(customer => {
        return {
          customerId: String(customer.customerId || 'N/A'),
          walletId: String(customer.walletId || 'N/A'),
          name: String(customer.name || 'N/A'),
          year: String(customer.yearOfStudy || 'N/A'),
          phoneNumber: String(customer.phoneNo || 'N/A'),
          email: String(customer.email || 'N/A'),
          walletBalance: `₹${customer.walletBalance.toFixed(2)?.toLocaleString() || '0'}`,
          totalOrders: String(customer.totalOrders || '0'),
          totalPurchase: `₹${customer.totalPurchaseCost.toFixed(2)?.toLocaleString() || '0'}`,
          lastOrderDate: customer.lastOrderDate
            ? new Date(customer.lastOrderDate).toLocaleDateString('en-IN')
            : 'N/A',
        }
      })

      console.log('Transformed customers:', transformedCustomers)
      setCustomersData(transformedCustomers)
    } catch (err) {
      setError(err.message || 'Failed to fetch customers')
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customersData.filter(
    (customer) => {
      const customerId = String(customer.customerId || '').toLowerCase()
      const walletId = String(customer.walletId || '').toLowerCase()
      const name = String(customer.name || '').toLowerCase()
      const query = searchQuery.toLowerCase()

      return customerId.includes(query) ||
        walletId.includes(query) ||
        name.includes(query)
    }
  )

  const tableData = filteredCustomers.map((c) => [
    c.customerId,
    c.walletId,
    c.name,
    c.year,
    c.phoneNumber,
    c.walletBalance,
    c.totalPurchase,
    <Button
      key={c.customerId}
      onClick={() => {
        setSelectedCustomer(c)
        setShowDetailsModal(true)
      }}
    >
      View
    </Button>,
  ])

  const handleCloseModal = () => {
    setShowDetailsModal(false)
    setSelectedCustomer(null)
  }

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return alert('No data to download')
    
    const headers = [
      'Customer Id',
      'Wallet Id',
      'Name',
      'Year',
      'Phone Number',
      'Email',
      'Wallet Balance',
      'Total Orders',
      'Total Purchase',
      'Last Order Date'
    ]

    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        [
          row.customerId,
          row.walletId,
          row.name,
          row.year,
          row.phoneNumber,
          row.email,
          row.walletBalance.replace('₹', '').replace(/,/g, ''),
          row.totalOrders,
          row.totalPurchase.replace('₹', '').replace(/,/g, ''),
          row.lastOrderDate
        ].map(val => {
          const stringVal = String(val === undefined || val === null ? '' : val).replace(/"/g, '""')
          return stringVal.includes(',') ? `"${stringVal}"` : stringVal
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Customers Management</h1>
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Customers Management</h1>
        <div className="flex flex-col items-center py-8">
          <div className="text-lg text-red-600 mb-4">Error: {error}</div>
          <Button onClick={fetchCustomers}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Customers Management</h1>

      {/* Search and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <Button 
          variant="black" 
          onClick={() => downloadCSV(filteredCustomers, 'Customers_List')}
        >
          ⬇ Export CSV
        </Button>
        <input
          type="text"
          placeholder="Search by ID or Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-black px-3 py-2 rounded w-full sm:w-80"
        />
      </div>

      <div className='pb-5'>
        <Card  title='Customer Details'>
          <Table
            headers={[
              'Customer Id',
              'Wallet Id',
              'Name',
              'Year',
              'Phone Number',
              'Wallet Balance',
              'Total purchase',
              'Actions',
            ]}
            data={tableData}
          />
        </Card>
      </div>

      {/* Modal for Customer Details */}
      <Modal
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        title={`Customer: ${selectedCustomer?.name}`}
        footer={
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        }
      >
        {selectedCustomer && (
          <table className="w-full text-sm border border-gray-300 rounded">
            <tbody>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Customer ID</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.customerId}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Wallet ID</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.walletId}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Year</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.year}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Phone Number</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.phoneNumber}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Email</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.email}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Wallet Balance</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.walletBalance}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Total Orders</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.totalOrders}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Total Purchase</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.totalPurchase}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-semibold">Last Order Date</td>
                <td className="p-2 border border-gray-300">{selectedCustomer.lastOrderDate}</td>
              </tr>
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  )
}

export default Customer