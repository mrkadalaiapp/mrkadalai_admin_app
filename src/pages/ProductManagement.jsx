import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Info, Trash2, Edit, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../components/ui/Loader';
import Badge from '../components/ui/Badge';

const categories = ['All', 'Meals', 'Starters', 'Desserts', 'Beverages'];
// Define your API base URL here, consistent with your api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api';


const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const outletId = localStorage.getItem('outletId');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productToRemove, setProductToRemove] = useState(null);
    const [productToEdit, setProductToEdit] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        threshold: '',
        minValue: '',
        outletId: outletId
    });

    // Image file states
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Edit form states
    const [editFormData, setEditFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        threshold: '',
        minValue: '',
        outletId: outletId
    });

    // Edit image file states
    const [editImageFile, setEditImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (selectedCategory === 'All') {
            setFilteredProducts(products);
        } else {
            setFilteredProducts(products.filter(product => product.category === selectedCategory));
        }
    }, [products, selectedCategory]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await apiRequest(`/superadmin/outlets/get-products/${outletId}`);
            setProducts(response.data || []);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch products');
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e, isEdit = false) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Only image files are allowed');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB');
                return;
            }
            if (isEdit) {
                setEditImageFile(file);
                setEditImagePreview(URL.createObjectURL(file));
            } else {
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            }
        }
    };

    const clearImage = (isEdit = false) => {
        if (isEdit) {
            setEditImageFile(null);
            if (editImagePreview) {
                URL.revokeObjectURL(editImagePreview);
                setEditImagePreview(null);
            }
        } else {
            setImageFile(null);
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
                setImagePreview(null);
            }
        }
    };

    // MODIFIED: Use direct fetch for FormData submission
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const productFormData = new FormData();

            productFormData.append('name', formData.name);
            productFormData.append('description', formData.description);
            productFormData.append('price', formData.price);
            productFormData.append('category', formData.category);
            productFormData.append('threshold', formData.threshold || '10');
            productFormData.append('minValue', formData.minValue || '0');
            productFormData.append('outletId', formData.outletId);

            if (imageFile) {
                productFormData.append('image', imageFile);
            }

            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/superadmin/outlets/add-product/`, {
                method: 'POST',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: productFormData, // Send FormData directly
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to add product');
            }

            setShowAddModal(false);
            resetFormData();
            fetchProducts();
            toast.success('Product added successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to add product');
        }
    };

    // MODIFIED: Use direct fetch for FormData submission
    const handleEditProduct = async (e) => {
        e.preventDefault();
        try {
            const productFormData = new FormData();

            productFormData.append('name', editFormData.name);
            productFormData.append('description', editFormData.description);
            productFormData.append('price', editFormData.price);
            productFormData.append('category', editFormData.category);
            productFormData.append('threshold', editFormData.threshold || '10');
            productFormData.append('minValue', editFormData.minValue || '0');
            productFormData.append('outletId', editFormData.outletId);

            if (editImageFile) {
                productFormData.append('image', editImageFile);
            }

            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/superadmin/outlets/update-product/${productToEdit.id}`, {
                method: 'PUT',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: productFormData, // Send FormData directly
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update product');
            }

            setShowEditModal(false);
            setProductToEdit(null);
            resetEditFormData();
            fetchProducts();
            toast.success('Product updated successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to update product');
        }
    };

    const handleRemoveProduct = async () => {
        if (!productToRemove) return;
        try {
            await apiRequest(`/superadmin/outlets/delete-product/${productToRemove.id}`, {
                method: 'DELETE'
            });
            setShowRemoveModal(false);
            setProductToRemove(null);
            fetchProducts();
            toast.success('Product removed successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to remove product');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetFormData = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            category: '',
            threshold: '',
            minValue: '',
            outletId: outletId
        });
        clearImage(false);
    };

    const resetEditFormData = () => {
        setEditFormData({
            name: '',
            description: '',
            price: '',
            category: '',
            threshold: '',
            minValue: '',
            outletId: outletId
        });
        clearImage(true);
    };

    const openRemoveModal = (product) => {
        setProductToRemove(product);
        setShowRemoveModal(true);
    };

    const openDetailsModal = (product) => {
        setSelectedProduct(product);
        setShowDetailsModal(true);
    };

    const openEditModal = (product) => {
        setProductToEdit(product);
        setEditFormData({
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            category: product.category,
            threshold: product.inventory?.threshold?.toString() || '',
            minValue: product.minValue?.toString() || '0',
            outletId: outletId
        });
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader />
            </div>
        );
    }

    // The rest of your component's JSX remains exactly the same.
    // ... (return statement with JSX)
    return (
        <div className="space-y-6 p-4">
            <h1 className="text-4xl font-bold">Product Management</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Filter & Action Buttons */}
            <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border rounded-md"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="flex space-x-2">
                    <Button
                        variant='success'
                        onClick={() => setShowAddModal(true)}
                    >
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Products Grid */}
            <Card title={selectedCategory === 'All' ? 'All Products' : `${selectedCategory} Products`}>
                <div className="max-h-96 overflow-y-auto scrollbar-hide">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="bg-bg rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100"
                                onClick={() => openDetailsModal(product)}
                            >
                                <div className="relative w-full h-48">
                                    <img
                                        src={product.imageUrl || '/api/placeholder/200/200'}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = '/api/placeholder/200/200';
                                        }}
                                    />
                                    {(product.inventory?.quantity || 0) === 0 && (
                                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                            <span className="text-white text-lg font-semibold">Out of Stock</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="mb-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            {product.category}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-semibold truncate mb-1">{product.name}</h4>
                                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description || 'No description available'}</p>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-2xl font-bold text-green-600">₹{product.price}</span>
                                        <Badge variant={(product.inventory?.quantity || 0) > 0 ? 'success' : 'danger'}>
                                            {(product.inventory?.quantity || 0) > 0
                                                ? `${product.inventory?.quantity || 0} in stock`
                                                : 'Sold out'
                                            }
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <div className="flex space-x-1">
                                            {/* <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetailsModal(product);
                                                }}
                                                className="flex items-center px-3 py-1.5 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-md"
                                            >
                                                <Info className="w-3 h-3 mr-1" />
                                                Details
                                            </button> */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(product);
                                                }}
                                                className="flex items-center px-3 py-1.5 text-green-600 hover:text-white hover:bg-green-600 border border-green-600 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-md"
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Edit
                                            </button>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRemoveModal(product);
                                            }}
                                            className="flex items-center px-3 py-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-md"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">📦</div>
                            <div className="text-gray-500 text-lg font-medium mb-2">
                                No products found
                            </div>
                            <div className="text-gray-400 text-sm">
                                {selectedCategory === 'All'
                                    ? 'No products available. Add your first product to get started.'
                                    : `No products found in the "${selectedCategory}" category.`
                                }
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Add Product Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Product"
                footer={
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowAddModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleAddProduct}
                        >
                            Add Product
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                required
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Category</option>
                                {categories.filter(cat => cat !== 'All').map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Image Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Image
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="mx-auto h-32 w-32 object-cover rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => clearImage(false)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto h-4 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                <span>Upload a file</span>
                                                <input
                                                    id="image-upload"
                                                    name="image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageChange(e, false)}
                                                    className="sr-only"
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alert Threshold
                            </label>
                            <input
                                type="number"
                                name="threshold"
                                value={formData.threshold}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Value *
                            </label>
                            <input
                                type="number"
                                name="minValue"
                                value={formData.minValue}
                                onChange={handleInputChange}
                                required
                                min="0"
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Edit Product Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Product"
                footer={
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowEditModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleEditProduct}
                        >
                            Update Product
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleEditProduct} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={editFormData.name}
                            onChange={handleEditInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            name="description"
                            value={editFormData.description}
                            onChange={handleEditInputChange}
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={editFormData.price}
                                onChange={handleEditInputChange}
                                required
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                name="category"
                                value={editFormData.category}
                                onChange={handleEditInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Category</option>
                                {categories.filter(cat => cat !== 'All').map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Image Upload Section for Edit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Image
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {editImagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={editImagePreview}
                                            alt="Preview"
                                            className="mx-auto h-32 w-32 object-cover rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => clearImage(true)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : productToEdit?.imageUrl ? (
                                    <div className="relative">
                                        <img
                                            src={productToEdit.imageUrl}
                                            alt="Current"
                                            className="mx-auto h-32 w-32 object-cover rounded-md"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Current image</p>
                                        <label htmlFor="edit-image-upload" className="mt-2 cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                            <span className="text-sm">Change image</span>
                                            <input
                                                id="edit-image-upload"
                                                name="edit-image-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageChange(e, true)}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="edit-image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                <span>Upload a file</span>
                                                <input
                                                    id="edit-image-upload"
                                                    name="edit-image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageChange(e, true)}
                                                    className="sr-only"
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alert Threshold
                            </label>
                            <input
                                type="number"
                                name="threshold"
                                value={editFormData.threshold}
                                onChange={handleEditInputChange}
                                min="0"
                                placeholder="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Value *
                            </label>
                            <input
                                type="number"
                                name="minValue"
                                value={editFormData.minValue}
                                onChange={handleEditInputChange}
                                required
                                min="0"
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Remove Product Modal */}
            <Modal
                isOpen={showRemoveModal}
                onClose={() => setShowRemoveModal(false)}
                title="Remove Product"
                footer={
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowRemoveModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleRemoveProduct}
                        >
                            Remove
                        </Button>
                    </div>
                }
            >
                <p className="text-gray-700">
                    Are you sure you want to remove "{productToRemove?.name}"? This action cannot be undone.
                </p>
            </Modal>

            {/* Product Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Product Details"
                footer={
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowDetailsModal(false)}
                        >
                            Close
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setShowDetailsModal(false);
                                openEditModal(selectedProduct);
                            }}
                        >
                            Edit Product
                        </Button>
                    </div>
                }
            >
                {selectedProduct && (
                    <div className="space-y-4">
                        <div className="aspect-square w-48 mx-auto overflow-hidden rounded-md">
                            <img
                                src={selectedProduct.imageUrl || '/api/placeholder/200/200'}
                                alt={selectedProduct.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.src = '/api/placeholder/200/200';
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <div>
                                <span className="font-semibold">Name: </span>
                                <span>{selectedProduct.name}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Description: </span>
                                <span>{selectedProduct.description}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Price: </span>
                                <span className="text-green-600 font-bold">₹{selectedProduct.price}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Category: </span>
                                <span>{selectedProduct.category}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Min Value: </span>
                                <span className="text-blue-600 font-semibold">{selectedProduct.minValue || 0}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Outlet ID: </span>
                                <span>{selectedProduct.outletId}</span>
                            </div>
                            {selectedProduct.inventory && (
                                <>
                                    <div>
                                        <span className="font-semibold">Current Stock: </span>
                                        <span className="text-orange-600 font-semibold">{selectedProduct.inventory.quantity}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Alert Threshold: </span>
                                        <span>{selectedProduct.inventory.threshold}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProductManagement;