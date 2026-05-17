import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { User } from 'lucide-react';
import { apiRequest } from '../utils/api';
import toast from 'react-hot-toast';
import Loader from '../components/ui/Loader';
import { AuthContext } from '../context/AuthContext';

const AdminDetails = () => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('details');
    const [selectedOutletId, setSelectedOutletId] = useState('');

    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { id } = useParams();
    const navigate = useNavigate();

    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingPermissions, setIsEditingPermissions] = useState(false);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false); // NEW STATE

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        adminRole: '',
    });

    useEffect(() => {
        fetchAdminDetails();
    }, [id]);

    const fetchAdminDetails = async () => {
        try {
            setLoading(true);
            const response = await apiRequest(`/superadmin/admin/${id}`, {
                method: 'GET'
            });

            // Check if API is returning array or object
            const adminMember = Array.isArray(response)
                ? response[0]   // Take first element if it's an array
                : response.admin || response; // else handle object

            if (adminMember) {
                setAdmin(adminMember);
                setFormData({
                    name: adminMember.name || '',
                    email: adminMember.email || '',
                    phone: adminMember.phone || '',
                    adminRole: adminMember.adminRole || '',
                });
            } else {
                setError('Admin not found');
            }
        } catch (err) {
            setError('Failed to fetch admin details');
            console.error('Error fetching admin details:', err);
        } finally {
            setLoading(false);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePermissionChange = (outletId, permType, checked) => {
        setAdmin((prev) => {
            const updatedOutlets = prev.outlets.map((outlet) => {
                if (outlet.outletId === outletId) {
                    return {
                        ...outlet,
                        permissions: outlet.permissions.map((perm) =>
                            perm.type === permType
                                ? { ...perm, isGranted: checked }
                                : perm
                        ),
                    };
                }
                return outlet;
            });
            return { ...prev, outlets: updatedOutlets };
        });
    };

    const saveAdminDetails = async () => {
        try {
            await apiRequest(`/superadmin/outlets/update-admin/${admin.id}`, {
                method: 'PUT',
                body: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    adminRole: formData.adminRole,
                },
            });
            toast.success('Admin details updated successfully');
            setIsEditingDetails(false);
            await fetchAdminDetails();
        } catch (err) {
            console.error('Error saving admin details:', err);
            toast.error('Failed to save admin details');
        }
    };

    const savePermissions = async () => {
        try {
            setIsSavingPermissions(true); // START LOADING
            // Build the permissions object based on the updated state
            const permissionsPayload = {};
            admin.outlets.forEach((outlet) => {
                permissionsPayload[outlet.outletId] = outlet.permissions.map((perm) => ({
                    type: perm.type,
                    isGranted: perm.isGranted
                }));
            });

            console.groupCollapsed();
            console.log(permissionsPayload);

            // Call new API with all permissions at once

            await apiRequest('/superadmin/assign-admin-permissions', {
                method: 'POST',
                body: {
                    adminId: admin.id,
                    permissions: permissionsPayload,
                },
            });

            toast.success('Permissions updated successfully');
            setIsEditingPermissions(false);
            await fetchAdminDetails();
        } catch (err) {
            console.error('Error saving permissions:', err);
            toast.error('Failed to save permissions');
        } finally {
            setIsSavingPermissions(false); // STOP LOADING
        }
    };

    const handleDeleteAdmin = async () => {
        const confirmDelete = window.confirm(
            'Are you sure you want to remove this admin?'
        );
        if (confirmDelete) {
            try {
                await apiRequest(`/superadmin/admin/${admin.id}`, {
                    method: 'DELETE',
                });
                toast.success('Admin deleted successfully');
                navigate('/admin');
            } catch (err) {
                console.error('Error deleting admin:', err);
                toast.error('Failed to delete admin');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader/>
            </div>
        );
    }

    if (error || !admin) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-red-500">{error || 'Admin not found'}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-10">
            {/* Tabs */}
            <div className="flex justify-start items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full bg-gray-200 hover:bg-gray-300 p-2"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black">
                        <polygon points="15,5 7,12 15,19" />
                    </svg>
                </button>

                <div className="flex space-x-4">
                    <Button
                        variant={activeTab === 'details' ? 'black' : 'secondary'}
                        onClick={() => setActiveTab('details')}
                    >
                        Admin Details
                    </Button>
                    <Button
                        variant={activeTab === 'permission' ? 'black' : 'secondary'}
                        onClick={() => setActiveTab('permission')}
                    >
                        Permissions
                    </Button>
                </div>
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
                <Card title={admin.name || 'N/A'} className="max-w-4xl mx-auto mt-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-16 h-16 text-gray-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        {[
                            ['name', 'Name'],
                            ['adminRole', 'Position'],
                            ['email', 'Email'],
                            ['phone', 'Phone'],
                        ].map(([field, label]) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700">{label}</label>
                                <input
                                    type={field === 'email' ? 'email' : 'text'}
                                    name={field}
                                    value={formData[field]}
                                    onChange={handleChange}
                                    disabled={!isEditingDetails}
                                    className={`mt-1 block w-full border rounded-md px-3 py-2 text-gray-900 disabled:bg-gray-100 ${!isEditingDetails ? 'cursor-not-allowed' : ''
                                        }`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center gap-4">
                        {isEditingDetails ? (
                            <>
                                <Button variant="primary" onClick={saveAdminDetails}>
                                    Save Details
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditingDetails(false)}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button variant="black" onClick={() => setIsEditingDetails(true)}>
                                Update Details
                            </Button>
                        )}
                        {user && Number(user.id) !== Number(admin.id) && (
                            <Button variant="danger" onClick={handleDeleteAdmin}>
                                Remove Admin
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permission' && (
                <Card title="Outlet-wise Permissions" className="max-w-4xl mx-auto mt-8">
                    {/* Dropdown to select outlet */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Outlet</label>
                        <select
                            className="border rounded-md px-3 py-2 w-full"
                            value={selectedOutletId}
                            onChange={(e) => setSelectedOutletId(Number(e.target.value))}
                        >
                            <option value="">-- Select an Outlet --</option>
                            {admin.outlets.map((outlet) => (
                                <option key={outlet.outletId} value={outlet.outletId}>
                                    {outlet.outlet.name} ({outlet.outlet.address})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Show permissions for the selected outlet */}
                    {selectedOutletId ? (
                        <div className="space-y-3">
                            {admin.outlets
                                .find((outlet) => outlet.outletId === selectedOutletId)
                                ?.permissions
                                .slice()
                                .sort((a, b) => a.type.localeCompare(b.type))  // SORT ALPHABETICALLY
                                .map((perm) => (
                                    <div key={perm.type} className="flex items-center justify-between">
                                        <span>{perm.type.replace(/_/g, ' ')}</span>
                                        <label
                                            className={`relative inline-flex items-center ${!isEditingPermissions
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={perm.isGranted}
                                                disabled={!isEditingPermissions}
                                                onChange={(e) =>
                                                    handlePermissionChange(
                                                        selectedOutletId,
                                                        perm.type,
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                            <div
                                                className={`w-11 h-6 rounded-full transition-colors duration-200 ${perm.isGranted ? 'bg-theme' : 'bg-black'
                                                    }`}
                                            ></div>
                                            <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all peer-checked:translate-x-full"></div>
                                        </label>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-center mt-4">Please select an outlet to view permissions.</div>
                    )}

                    {/* Save/Cancel buttons */}
                    <div className="flex justify-center mt-6 gap-4">
                        {isEditingPermissions ? (
                            <>
                                <Button variant="primary" onClick={savePermissions} disabled={isSavingPermissions}>
                                    {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditingPermissions(false)} disabled={isSavingPermissions}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button variant="black" onClick={() => setIsEditingPermissions(true)}>
                                Update Permissions
                            </Button>
                        )}
                    </div>
                </Card>
            )}

        </div>
    );
};

export default AdminDetails;
