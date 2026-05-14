import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { apiRequest } from '../utils/api'
import Loader from '../components/ui/Loader'

const Reports = () => {
    const [searchText, setSearchText] = useState('')
    const [activeTab, setActiveTab] = useState('sales')
    const [salesMetric, setSalesMetric] = useState('totalOrders') // totalOrders | totalItemsSold
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    })

    const [salesReportData, setSalesReportData] = useState([])
    const [revenueReportData, setRevenueReportData] = useState([])
    const [profitLossData, setProfitLossData] = useState([])
    const [customerTrendsData, setCustomerTrendsData] = useState([])

    // Revenue Analytics Data
    const [revenueByItemsData, setRevenueByItemsData] = useState([])
    const [revenueByDaysData, setRevenueByDaysData] = useState([])
    const [revenueSplitData, setRevenueSplitData] = useState(null)

    const [profitLossTrendsData, setProfitLossTrendsData] = useState([])
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const [customerOverviewData, setCustomerOverviewData] = useState(null)
    const [customerPerOrderData, setCustomerPerOrderData] = useState([])

    const outletId = localStorage.getItem('outletId')

    useEffect(() => {
        if (outletId) {
            fetchData()
        }
    }, [outletId, activeTab, dateRange, selectedYear])

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            if (activeTab === 'sales') {
                await fetchSalesReport()
            } else if (activeTab === 'revenue') {
                await fetchRevenueAnalytics()
            } else if (activeTab === 'profit') {
                await fetchProfitLossReport()
            } else if (activeTab === 'customer') {
                await fetchCustomerTrends()
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch data')
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchSalesReport = async () => {
        try {
            const response = await apiRequest(`/superadmin/outlets/sales-report/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    from: dateRange.from,
                    to: dateRange.to
                })
            })
            setSalesReportData(response || [])
        } catch (error) {
            console.error('Error fetching sales report:', error);
        }
    }

    const fetchRevenueAnalytics = async () => {
        try {
            // Fetch revenue by items
            const revenueByItemsResponse = await apiRequest(`/superadmin/outlets/revenue-report/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    from: dateRange.from,
                    to: dateRange.to
                })
            })
            setRevenueByItemsData(revenueByItemsResponse || [])

            // Fetch revenue split
            const revenueSplitResponse = await apiRequest(`/superadmin/outlets/revenue-split/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    from: dateRange.from,
                    to: dateRange.to
                })
            })
            setRevenueSplitData(revenueSplitResponse || null)

            // Fetch wallet recharge by day
            const walletRechargeResponse = await apiRequest(`/superadmin/outlets/wallet-recharge-by-day/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    from: dateRange.from,
                    to: dateRange.to
                })
            })
            setRevenueByDaysData(walletRechargeResponse || [])
        } catch (error) {
            console.error('Error fetching revenue analytics:', error)
        }
    }

    const fetchProfitLossReport = async () => {
        try {
            // Fetch profit/loss trends data
            const profitLossTrendsResponse = await apiRequest(`/superadmin/outlets/profit-loss-trends/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    year: selectedYear
                })
            })
            setProfitLossTrendsData(profitLossTrendsResponse || [])

        } catch (error) {
            console.error('Error fetching profit/loss report:', error)
            setProfitLossData([])
            setProfitLossTrendsData([])
        }
    }


    const fetchCustomerTrends = async () => {
        try {
            // Fetch customer overview
            const customerOverviewResponse = await apiRequest(`/superadmin/outlets/customer-overview/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    from: dateRange.from,
                    to: dateRange.to
                })
            })
            setCustomerOverviewData(customerOverviewResponse || null)

            const customerPerOrderResponse = await apiRequest(`/superadmin/outlets/customer-per-order/${outletId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    from: dateRange.from,
                    to: dateRange.to
                })
            })
            setCustomerPerOrderData(customerPerOrderResponse || [])
        } catch (error) {
            console.error('Error fetching customer trends:', error)
            setCustomerOverviewData(null)
            setCustomerPerOrderData([])
        }
    }

    const formatCurrency = (amount) => {
        return `₹${amount || 0}`
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-GB');
    }

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const getProfitLossChartData = () => {
        return profitLossTrendsData.map(item => ({
            ...item,
            month: getMonthName(item.month),
            originalProfit: item.profit.toFixed(2),
            profit: item.profit < 0 ? 0 : item.profit
        }))
    }

    const getCustomerOverviewPieData = () => {
        if (!customerOverviewData) return []

        return [
            {
                name: 'New Customers',
                value: customerOverviewData.newCustomers,
                color: '#3b82f6'
            },
            {
                name: 'Returning Customers',
                value: customerOverviewData.returningCustomers,
                color: '#10b981'
            }
        ].filter(item => item.value > 0)
    }

    const CustomerPerOrderTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                    <p className="font-semibold">{`Date: ${formatDateForDisplay(label)}`}</p>
                    <p className="text-blue-600">
                        Customers per Order: {payload[0].value.toFixed(2)}
                    </p>
                </div>
            )
        }
        return null
    }

    const ProfitLossTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                    <p className="font-semibold">{`Month: ${label}`}</p>
                    {payload.map((entry, index) => {
                        let value = entry.value;
                        let displayValue = formatCurrency(value);

                        // For profit, show original value (including negative) in tooltip
                        if (entry.dataKey === 'profit') {
                            const originalProfit = entry.payload.originalProfit;
                            displayValue = formatCurrency(originalProfit);
                            return (
                                <p key={index} style={{ color: entry.color }}>
                                    {`${entry.name}: ${displayValue}`}
                                    {originalProfit < 0 && <span className="text-red-500 ml-1">(Loss)</span>}
                                </p>
                            );
                        }

                        return (
                            <p key={index} style={{ color: entry.color }}>
                                {`${entry.name}: ${displayValue}`}
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    }

    const getMonthName = (monthNumber) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return months[monthNumber - 1]
    }

    const getFilteredData = (data, searchFields) => {
        if (!searchText) return data

        return data.filter(item =>
            searchFields.some(field =>
                item[field]?.toString().toLowerCase().includes(searchText.toLowerCase())
            )
        )
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setSearchText('')
    }

    const downloadCSV = (data, filename, headers) => {
        if (!data || data.length === 0) return alert('No data to download')
        
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const val = row[header] === undefined || row[header] === null ? '' : row[header]
                    // Escape quotes and wrap in quotes if contains comma
                    const stringVal = String(val).replace(/"/g, '""')
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

    const handleDownloadReport = () => {
        if (activeTab === 'sales') {
            const data = getFilteredData(salesReportData, ['productName'])
            downloadCSV(data, 'Sales_Report', ['productName', 'totalOrders', 'totalItemsSold'])
        } else if (activeTab === 'revenue') {
            const data = getFilteredData(revenueByItemsData, ['productName'])
            downloadCSV(data, 'Revenue_Analytics_Report', ['productName', 'revenue'])
        } else if (activeTab === 'profit') {
            // Profit Loss Trends data mapping for CSV
            const csvData = profitLossTrendsData.map(item => ({
                ...item,
                monthName: getMonthName(item.month),
                profitValue: item.profit.toFixed(2)
            }))
            downloadCSV(csvData, 'Profit_Loss_Report', ['monthName', 'sales', 'recharges', 'expenses', 'profitValue'])
        } else if (activeTab === 'customer') {
            const data = getFilteredData(customerPerOrderData, ['date'])
            downloadCSV(data, 'Customer_Trends_Report', ['date', 'customersPerOrder'])
        }
    }

    const handleDateRangeChange = (field, value) => {
        setDateRange(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const setQuickDateRange = (days) => {
        const to = new Date().toISOString().split('T')[0]
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        setDateRange({ from, to })
    }

    const isQuickDateRangeActive = (days) => {
        const expectedFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const expectedTo = new Date().toISOString().split('T')[0]
        return dateRange.from === expectedFrom && dateRange.to === expectedTo
    }

    // Custom tooltip for bar charts
    const CustomTooltip = ({ active, payload, label, metric }) => {
        if (active && payload && payload.length) {
            const dataKey = payload[0].dataKey;
            let labelText = 'Value';
            if (dataKey === 'totalOrders') labelText = 'Orders';
            else if (dataKey === 'totalItemsSold') labelText = 'Items Sold';
            else if (dataKey === 'revenue') labelText = 'Revenue';

            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                    <p className="font-semibold">{label}</p>
                    <p className="text-blue-600">
                        {labelText}: {dataKey === 'revenue' ? formatCurrency(payload[0].value) : payload[0].value}
                    </p>
                </div>
            )
        }
        return null
    }

    // Custom tooltip for pie chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                    <p className="font-semibold">{payload[0].name}</p>
                    <p className="text-blue-600">
                        Revenue: {formatCurrency(payload[0].value)}
                    </p>
                </div>
            )
        }
        return null
    }

    // Prepare pie chart data
    const getPieChartData = () => {
        if (!revenueSplitData) return []

        return [
            { name: 'App Orders', value: revenueSplitData.revenueByAppOrder, color: '#3b82f6' },
            { name: 'Manual Orders', value: revenueSplitData.revenueByManualOrder, color: '#10b981' },
            { name: 'Wallet Recharge', value: revenueSplitData.revenueByWalletRecharge, color: '#f59e0b' }
        ].filter(item => item.value > 0)
    }

    // Profit/Loss Report Data Mapping
    const filteredProfitLossReport = getFilteredData(profitLossData, ['category', 'period'])
    const profitLossReportMap = filteredProfitLossReport.map(profit => [
        profit.category,
        profit.period,
        formatCurrency(profit.revenue),
        formatCurrency(profit.cost),
        formatCurrency(profit.profit),
        `${profit.profitMargin}%` || 'N/A',
        <Badge
            variant={profit.profit > 0 ? 'success' : profit.profit < 0 ? 'danger' : 'secondary'}
            key={profit.id}
        >
            {profit.profit > 0 ? 'Profit' : profit.profit < 0 ? 'Loss' : 'Breakeven'}
        </Badge>
    ])

    // Customer Trends Data Mapping
    const filteredCustomerTrends = getFilteredData(customerTrendsData, ['customerId', 'customerName'])
    const customerTrendsMap = filteredCustomerTrends.map(customer => [
        `#CUST${customer.customerId?.toString().padStart(3, '0') || 'N/A'}`,
        customer.customerName,
        customer.totalOrders,
        formatCurrency(customer.totalSpent),
        formatCurrency(customer.averageOrderValue),
        formatDate(customer.lastOrder),
        <Badge
            variant={customer.frequency === 'High' ? 'success' :
                customer.frequency === 'Medium' ? 'pending' : 'secondary'}
            key={customer.customerId}
        >
            {customer.frequency || 'Low'}
        </Badge>
    ])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-bold">Reports and Analytics</h1>
                    <Button variant="black">Download Report</Button>
                </div>
                <div className="flex justify-center items-center h-64">
                    <Loader />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold">Reports and Analytics</h1>
                <Button variant="black" onClick={handleDownloadReport}>
                    Download Report
                </Button>
            </div>

            <div className='flex justify-between items-center'>
                <div className='flex space-x-4'>
                    <Button
                        variant={activeTab === 'sales' ? 'black' : 'secondary'}
                        onClick={() => handleTabChange('sales')}
                    >
                        Sales Report
                    </Button>
                    <Button
                        variant={activeTab === 'revenue' ? 'black' : 'secondary'}
                        onClick={() => handleTabChange('revenue')}
                    >
                        Revenue Analytics
                    </Button>
                    <Button
                        variant={activeTab === 'profit' ? 'black' : 'secondary'}
                        onClick={() => handleTabChange('profit')}
                    >
                        Profit/Loss Report
                    </Button>
                    <Button
                        variant={activeTab === 'customer' ? 'black' : 'secondary'}
                        onClick={() => handleTabChange('customer')}
                    >
                        Customer Trends
                    </Button>
                </div>
            </div>

            {/* Sales Report Tab */}
            {activeTab === 'sales' && (
                <div className="space-y-4">
                    {/* Date Range Controls */}
                    <div className="flex justify-between items-center  p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <span className="text-xl font-medium text-gray-700">Date Range:</span>
                            <div className="flex space-x-2">
                                <Button
                                    variant={isQuickDateRangeActive(7) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(7)}
                                    className="text-sm px-3 py-1"
                                >
                                    7 Days
                                </Button>
                                <Button
                                    variant={isQuickDateRangeActive(30) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(30)}
                                    className="text-sm px-3 py-1"
                                >
                                    30 Days
                                </Button>
                                <Button
                                    variant={isQuickDateRangeActive(90) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(90)}
                                    className="text-sm px-3 py-1"
                                >
                                    90 Days
                                </Button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Custom:</span>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </div>
                    </div>

                    {/* Sales Chart Header */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Sales Report - {salesMetric === 'totalOrders' ? 'Number of Orders' : 'Total Items Sold'}</h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setSalesMetric('totalOrders')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${salesMetric === 'totalOrders' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Order Count
                            </button>
                            <button 
                                onClick={() => setSalesMetric('totalItemsSold')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${salesMetric === 'totalItemsSold' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Items Sold
                            </button>
                        </div>
                    </div>

                    <Card>
                        {salesReportData && salesReportData.length > 0 ? (
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={salesReportData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="productName"
                                            axisLine={true}
                                            tickLine={true}
                                            tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                                            height={80}
                                            interval={0}
                                        />
                                        <YAxis
                                            axisLine={true}
                                            tickLine={true}
                                            tick={{ fontSize: 12 }}
                                            label={{ value: 'Number of Orders', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip content={<CustomTooltip metric={salesMetric} />} />
                                        <Bar
                                            dataKey={salesMetric}
                                            fill={salesMetric === 'totalOrders' ? '#3b82f6' : '#10b981'}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                No sales data found for the selected date range
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Revenue Analytics Tab */}
            {activeTab === 'revenue' && (
                <div className="space-y-6">
                    {/* Header */}
                    {/* <div className="text-left">
                        <h2 className="text-2xl font-bold text-gray-800">Revenue Analytics and Insights</h2>
                    </div> */}

                    {/* Date Range Controls */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700">Date Range:</span>
                            <div className="flex space-x-2">
                                <Button
                                    variant={isQuickDateRangeActive(7) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(7)}
                                    className="text-sm px-3 py-1"
                                >
                                    7 Days
                                </Button>
                                <Button
                                    variant={isQuickDateRangeActive(30) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(30)}
                                    className="text-sm px-3 py-1"
                                >
                                    30 Days
                                </Button>
                                <Button
                                    variant={isQuickDateRangeActive(90) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(90)}
                                    className="text-sm px-3 py-1"
                                >
                                    90 Days
                                </Button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Custom:</span>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </div>
                    </div>

                    {/* Revenue Summary Cards */}
                    {revenueSplitData && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">Total Revenue</h3>
                                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueSplitData.totalRevenue.toFixed(2))}</p>
                                </div>
                            </Card>
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">App Orders</h3>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueSplitData.revenueByAppOrder.toFixed(2))}</p>
                                </div>
                            </Card>
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">Manual Orders</h3>
                                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(revenueSplitData.revenueByManualOrder.toFixed(2))}</p>
                                </div>
                            </Card>
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">Wallet Recharge</h3>
                                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(revenueSplitData.revenueByWalletRecharge.toFixed(2))}</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue by Items Bar Chart */}
                        <Card title="Revenue by Items">
                            {revenueByItemsData && revenueByItemsData.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={revenueByItemsData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="productName"
                                                axisLine={true}
                                                tickLine={true}
                                                tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                                                height={80}
                                                interval={0}
                                            />
                                            <YAxis
                                                axisLine={true}
                                                tickLine={true}
                                                tick={{ fontSize: 12 }}
                                                label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar
                                                dataKey="revenue"
                                                fill="#3b82f6"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    No revenue by items data found for the selected date range
                                </div>
                            )}
                        </Card>

                        {/* Revenue Split Pie Chart */}
                        <Card title="Revenue Split by Source">
                            {getPieChartData().length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={getPieChartData()}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {getPieChartData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    No revenue split data found for the selected date range
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Wallet Recharge by Day Chart */}
                    <Card title="Wallet Recharge Revenue by Day">
                        {revenueByDaysData && revenueByDaysData.length > 0 ? (
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={revenueByDaysData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={true}
                                            tickLine={true}
                                            tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                                            height={80}
                                            interval={0}
                                            tickFormatter={formatDateForDisplay}
                                        />
                                        <YAxis
                                            axisLine={true}
                                            tickLine={true}
                                            tick={{ fontSize: 12 }}
                                            label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey="revenue"
                                            fill="#f59e0b"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                No wallet recharge data found for the selected date range
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Error Display */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    {error && (
                        <div className="text-red-500 text-sm">
                            Error: {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Profit/Loss Report Tab */}
            {activeTab === 'profit' && (
                <div className="space-y-6">
                    {/* Year Selector */}
                    <div className="flex justify-start items-center bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700">Select Year:</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Profit/Loss Trends Chart */}
                    <div className='pb-5'>
                        <Card title={`Profit/Loss Trends - ${selectedYear}`}>
                            {profitLossTrendsData && profitLossTrendsData.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={getProfitLossChartData()}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={true}
                                                tickLine={true}
                                                tick={{ fontSize: 12 }}
                                                height={60}
                                            />
                                            <YAxis
                                                axisLine={true}
                                                tickLine={true}
                                                tick={{ fontSize: 12 }}
                                                label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip content={<ProfitLossTooltip />} />
                                            <Legend />
                                            <Bar
                                                dataKey="sales"
                                                fill="#10b981"
                                                name="Sales"
                                                radius={[2, 2, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="expenses"
                                                fill="#ef4444"
                                                name="Expenses"
                                                radius={[2, 2, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="profit"
                                                fill="#3b82f6"
                                                name="Profit"
                                                radius={[2, 2, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    No profit/loss trends data found for {selectedYear}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* Customer Trends Tab */}
            {activeTab === 'customer' && (
                <div className="space-y-6">
                    {/* Date Range Controls */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700">Date Range:</span>
                            <div className="flex space-x-2">
                                <Button
                                    variant={isQuickDateRangeActive(7) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(7)}
                                    className="text-sm px-3 py-1"
                                >
                                    7 Days
                                </Button>
                                <Button
                                    variant={isQuickDateRangeActive(30) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(30)}
                                    className="text-sm px-3 py-1"
                                >
                                    30 Days
                                </Button>
                                <Button
                                    variant={isQuickDateRangeActive(90) ? 'black' : 'secondary'}
                                    onClick={() => setQuickDateRange(90)}
                                    className="text-sm px-3 py-1"
                                >
                                    90 Days
                                </Button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Custom:</span>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </div>
                    </div>

                    {/* Customer Overview Summary Cards */}
                    {customerOverviewData && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">Total Customers</h3>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {customerOverviewData.newCustomers + customerOverviewData.returningCustomers}
                                    </p>
                                </div>
                            </Card>
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">New Customers</h3>
                                    <p className="text-2xl font-bold text-green-600">{customerOverviewData.newCustomers}</p>
                                </div>
                            </Card>
                            <Card>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-700">Returning Customers</h3>
                                    <p className="text-2xl font-bold text-purple-600">{customerOverviewData.returningCustomers}</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-5">
                        {/* Customer Overview Pie Chart */}
                        <Card title="Customer Overview">
                            {getCustomerOverviewPieData().length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={getCustomerOverviewPieData()}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                innerRadius={40}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {getCustomerOverviewPieData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    No customer overview data found for the selected date range
                                </div>
                            )}
                        </Card>

                        {/* Customer Per Order Bar Chart */}
                        <Card title="Customer Per Order">
                            {customerPerOrderData && customerPerOrderData.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={customerPerOrderData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={true}
                                                tickLine={true}
                                                tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                                                height={80}
                                                interval={0}
                                                tickFormatter={formatDateForDisplay}
                                            />
                                            <YAxis
                                                axisLine={true}
                                                tickLine={true}
                                                tick={{ fontSize: 12 }}
                                                label={{ value: 'Customers per Order', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip content={<CustomerPerOrderTooltip />} />
                                            <Bar
                                                dataKey="customersPerOrder"
                                                fill="#8b5cf6"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    No customer per order data found for the selected date range
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

        </div>
    )
}

export default Reports