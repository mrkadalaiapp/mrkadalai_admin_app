import React, { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const ManualOrder = () => {
    const [selectedItems, setSelectedItems] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')

    const menuItems = [
        { id: 1, name: 'Spring Rolls', price: 120, category: 'meals', img: 'https://via.placeholder.com/100' },
        { id: 2, name: 'Chicken Wings', price: 180, category: 'meals', img: 'https://via.placeholder.com/100' },
        { id: 3, name: 'Chicken Biryani', price: 250, category: 'meals', img: 'https://via.placeholder.com/100' },
        { id: 4, name: 'Veg Fried Rice', price: 180, category: 'meals', img: 'https://via.placeholder.com/100' },
        { id: 5, name: 'Butter Chicken', price: 280, category: 'meals', img: 'https://via.placeholder.com/100' },
        { id: 6, name: 'Ice Cream', price: 80, category: 'desserts', img: 'https://via.placeholder.com/100' },
        { id: 7, name: 'Gulab Jamun', price: 60, category: 'desserts', img: 'https://via.placeholder.com/100' },
        { id: 8, name: 'Coke', price: 50, category: 'beverages', img: 'https://via.placeholder.com/100' },
        { id: 9, name: 'Lassi', price: 70, category: 'beverages', img: 'https://via.placeholder.com/100' }
    ]

    const addToOrder = (item) => {
        const exists = selectedItems.find(i => i.id === item.id)
        if (exists) {
            setSelectedItems(selectedItems.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ))
        } else {
            setSelectedItems([...selectedItems, { ...item, quantity: 1 }])
        }
    }

    const getTotalAmount = () => {
        return selectedItems.reduce((total, item) => total + item.price * item.quantity, 0)
    }

    const filteredMenuItems = menuItems.filter(item =>
        (activeCategory === 'all' || item.category === activeCategory) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 h-screen overflow-hidden gap-4">
            {/* Left: Order Summary */}
            <div className="lg:col-span-1 overflow-y-auto p-4">
                <Card title="Your Order">
                    <div className="space-y-4">
                        {selectedItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                                </div>
                                <p className="font-medium">₹{item.price * item.quantity}</p>
                            </div>
                        ))}
                        {selectedItems.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No items added</p>
                        )}
                        <hr />
                        <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>₹{getTotalAmount()}</span>
                        </div>
                        <Button
                            className="w-full mt-4 bg-theme"
                            disabled={selectedItems.length === 0}
                        >
                            Place Order
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Right: Scrollable Menu with White BG */}
            <div className="lg:col-span-2 bg-white h-full overflow-y-auto scrollbar-hide p-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full md:w-1/2 p-2 border rounded"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <Button
                            variant={activeCategory === 'all' ? 'black' : 'secondary'}
                            onClick={() => setActiveCategory('all')}
                        >All</Button>
                        <Button
                            variant={activeCategory === 'meals' ? 'black' : 'secondary'}
                            onClick={() => setActiveCategory('meals')}
                        >Meals</Button>
                        <Button
                            variant={activeCategory === 'desserts' ? 'black' : 'secondary'}
                            onClick={() => setActiveCategory('desserts')}
                        >Desserts</Button>
                        <Button
                            variant={activeCategory === 'beverages' ? 'black' : 'secondary'}
                            onClick={() => setActiveCategory('beverages')}
                        >Beverages</Button>
                        <Button
                            variant={activeCategory === 'combo' ? 'black' : 'secondary'}
                            onClick={() => setActiveCategory('combo')}
                        >Combo</Button>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMenuItems.map(item => (
                        <div key={item.id} className="border rounded p-4 flex flex-col items-center text-center shadow-sm">
                            <img src={item.img} alt={item.name} className="w-24 h-24 object-cover mb-2 rounded" />
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">₹{item.price}</p>
                            <Button size="sm" onClick={() => addToOrder(item)}>Add</Button>
                        </div>
                    ))}
                    {filteredMenuItems.length === 0 && (
                        <p className="col-span-full text-center text-gray-500">No items found</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ManualOrder
