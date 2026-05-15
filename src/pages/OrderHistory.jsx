import React, { useState, useEffect } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { apiRequest } from '../utils/api'
import Loader from '../components/ui/Loader'

const OrderHistory = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const outletId = localStorage.getItem('outletId');

    const formatDate = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const date = new Date(dateString);
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const options = { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' };
        return utcDate.toLocaleDateString('en-GB', options);
    };

    // ── CSV Export helper ─────────────────────────────────────────────────────────
    const exportCSV = (rows, filename) => {
        const headers = ['Order Id', 'Name', 'Phone', 'Status', 'Order Type', 'Total Amount', 'Order Date', 'Delivery Date', 'Delivery Slot', 'Payment Method', 'Items'];
        const csvContent = [
            headers.join(','),
            ...rows.map(r => {
                const itemsStr = r.orderItems.map(i => `${i.item} (x${i.quantity})`).join('; ');
                const values = [
                    r.orderId,
                    r.name,
                    r.phone,
                    r.status,
                    r.orderType,
                    r.totalAmount.toFixed(2),
                    r.timeStamp,
                    r.deliveryDate,
                    r.deliverySlot,
                    r.paymentMethod || '',
                    itemsStr
                ];
                return values.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };
    

    const formatSlot = (slot) => {
        if (!slot || slot === 'N/A') return 'N/A';
        try {
            const parts = slot.replace('SLOT_', '').split('_');
            const startTime = parseInt(parts[0], 10);
            const endTime = parseInt(parts[1], 10);
    
            const formatHour = (hour) => {
                if (hour === 12) return '12 PM';
                if (hour === 0) return '12 AM';
                const ampm = hour < 12 ? 'AM' : 'PM';
                const h = hour % 12 || 12; 
                return `${h} ${ampm}`;
            };
    
            return `${formatHour(startTime)} - ${formatHour(endTime)}`;
        } catch (e) {
            return slot; 
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiRequest(`/superadmin/outlets/${outletId}/orders/`);

            const transformedOrders = response.map(order => ({
                orderId: `#${order.orderId.toString().padStart(3, '0')}`,
                name: order.customerName,
                phone: order.customerPhone,
                status: order.status.toLowerCase(),
                orderType: order.type,
                deliveryDate: formatDate(order.deliveryDate),
                deliverySlot: formatSlot(order.deliverySlot),
                orderItems: order.items.map(item => ({
                    item: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                })),
                timeStamp: formatDate(order.orderTime),
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod
            }));

            setOrders(transformedOrders);
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(ord =>
        (ord.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ord.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (statusFilter === '' || ord.status === statusFilter)
    );

    const openModal = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedOrder(null);
        setShowModal(false);
    };

    const getStatusVariant = (status) => {
        switch (status.toLowerCase()) {
            case 'delivered':
            case 'completed':
                return 'success';
            case 'partially_delivered':
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'danger';
            default:
                return 'info';
        }
    };

    const searchedOrders = filteredOrders.map(ord => [
        ord.orderId,
        ord.name,
        ord.orderItems.length > 2
            ? `${ord.orderItems.slice(0, 1).map(i => i.item).join(', ')}, +${ord.orderItems.length - 1}`
            : ord.orderItems.map(i => i.item).join(', '),
        <Badge variant={getStatusVariant(ord.status)}>{ord.status}</Badge>,
        `₹${ord.totalAmount.toFixed(2)}`,
        ord.orderType === 'MANUAL'
            ? <Badge variant="info">Manual</Badge>
            : <Badge variant="success">App</Badge>,
        ord.timeStamp,
        ord.deliveryDate,
        <Button onClick={() => openModal(ord)}>View</Button>
    ]);

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-4xl font-bold">Order Management</h1>
                <Card title='Order Management'>
                    <div className="flex p-8 justify-center items-center">
                        <Loader />
                    </div>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-4xl font-bold">Order Management</h1>
                <Card title='Order Management'>
                    <div className="p-8 text-center text-red-600">
                        <p>Error loading orders: {error}</p>
                        <Button onClick={fetchOrders} className="mt-4">Retry</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Order Management</h1>

            <div className='flex justify-end items-center space-x-4'>
                <select
                    className='border rounded p-2'
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value=''>All</option>
                    <option value='pending'>Pending</option>
                    <option value='delivered'>Delivered</option>
                    <option value='cancelled'>Cancelled</option>
                    <option value='partially_delivered'>Partially Delivered</option>
                </select>
                <input
                    type='text'
                    placeholder='Search by ID or Name'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='border rounded p-2'
                />
                <Button onClick={fetchOrders}>Refresh</Button>
                <Button variant="black" onClick={() => exportCSV(filteredOrders, `orders-${new Date().toISOString().split('T')[0]}.csv`)}>
                    ⬇ Export CSV
                </Button>
            </div>

            <div className='pb-5'>
                <Card title='Order Management'>
                    <Table
                        headers={['Order Id', 'Name', 'Order Items', 'Status', 'Total Amount', 'Order Type', 'Order Date', 'Delivery Date', 'Actions']}
                        data={searchedOrders}
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={`Order Details: ${selectedOrder?.orderId}`}
                footer={
                    <Button variant="black" onClick={closeModal}>Close</Button>
                }
            >
                {selectedOrder && (
                    <div className="space-y-4">
                        <div>
                            <p><strong>Customer Name:</strong> {selectedOrder.name}</p>
                            <p><strong>Phone Number:</strong> {selectedOrder.phone}</p>
                            <p><strong>Status:</strong> <Badge variant={getStatusVariant(selectedOrder.status)}>{selectedOrder.status}</Badge></p>
                            <p><strong>Delivery Date:</strong> {selectedOrder.deliveryDate}</p>
                            <p><strong>Delivery Slot:</strong> {selectedOrder.deliverySlot}</p>
                            <p><strong>Order Type:</strong> {selectedOrder.orderType === 'MANUAL'
                                ? <Badge variant="info">Manual</Badge>
                                : <Badge variant="success">App</Badge>}
                            </p>
                            {selectedOrder.paymentMethod && (
                                <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
                            )}
                        </div>

                        <table className="w-full border border-gray-300 text-sm mt-4">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 border">Item</th>
                                    <th className="p-2 border">Quantity</th>
                                    <th className="p-2 border">Unit Price</th>
                                    <th className="p-2 border">Total Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.orderItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2 border">{item.item}</td>
                                        <td className="p-2 border">{item.quantity}</td>
                                        <td className="p-2 border">₹{item.unitPrice.toFixed(2)}</td>
                                        <td className="p-2 border">₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold bg-gray-50">
                                    <td colSpan="3" className="p-2 border text-right">Grand Total</td>
                                    <td className="p-2 border">
                                        ₹{selectedOrder.totalAmount.toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default OrderHistory;