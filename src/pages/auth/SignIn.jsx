import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { ROUTES } from '../../utils/constants.js';
import { useAuth } from '../../hooks/useAuth.js';

const SignIn = () => {
    const [userType, setUserType] = useState('admin'); // 'admin' or 'superadmin'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    const { adminSignIn, superAdminSignIn } = useAuth();

    // Clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleUserTypeChange = (type) => {
        setUserType(type);
        setError(''); // Clear any existing errors when switching types
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email is invalid';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            let response;
            
            if (userType === 'superadmin') {
                response = await superAdminSignIn(formData);
            } else {
                response = await adminSignIn(formData);
            }

            console.log('Sign in successful:', response);
            navigate(ROUTES.DASHBOARD, { replace: true });
            
        } catch (err) {
            console.error('Sign in error:', err);
            setError(err.message || 'Sign in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen w-full flex items-center justify-center p-4"
            style={{
                backgroundImage: `url('https://ezjbzdcdqvarkkbteptl.supabase.co/storage/v1/object/public/images/adbg.jpeg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center">
                    <img src="https://ezjbzdcdqvarkkbteptl.supabase.co/storage/v1/object/public/images/logo2.jpeg" alt="Logo" className="mx-auto h-20 w-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Admin Portal
                    </h2>
                    <p className="text-sm text-gray-600 mb-8">
                        {userType === 'admin' ? (
                            <>
                                Or{' '}
                                <Link
                                    to={ROUTES.ADMIN_SIGN_UP}
                                    className="font-medium text-yellow-600 hover:text-yellow-500"
                                >
                                    create a new admin account
                                </Link>
                            </>
                        ) : (
                            <span className="text-gray-500">SuperAdmin Access Only</span>
                        )}
                    </p>
                </div>

                {/* User Type Toggle */}
                <div className="mb-6">
                    <div className="flex rounded-lg bg-gray-100 p-1">
                        <button
                            type="button"
                            onClick={() => handleUserTypeChange('admin')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                userType === 'admin'
                                    ? 'bg-yellow-500 text-black shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Admin
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleUserTypeChange('superadmin')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                userType === 'superadmin'
                                    ? 'bg-yellow-500 text-black shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                SuperAdmin
                            </div>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 flex items-center" role="alert">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="text-sm font-semibold text-gray-700 block mb-1">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={`Enter your ${userType === 'superadmin' ? 'SuperAdmin' : 'Admin'} email`}
                            className={`w-full px-4 py-3 bg-white rounded-lg border-2 ${formErrors.email ? 'border-red-500' : 'border-gray-900'} focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200`}
                        />
                        {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="password" className="text-sm font-semibold text-gray-700 block mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            className={`w-full px-4 py-3 bg-white rounded-lg border-2 ${formErrors.password ? 'border-red-500' : 'border-gray-900'} focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200`}
                        />
                        {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-200 ease-in-out disabled:bg-yellow-300 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                    Signing in...
                                </div>
                            ) : (
                                `Sign in as ${userType === 'superadmin' ? 'SuperAdmin' : 'Admin'}`
                            )}
                        </button>
                    </div>
                </form>

                {/* Additional Info Based on User Type */}
                {/* {userType === 'admin' && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Admin Access
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <p>If you don't have an account, create one and wait for SuperAdmin verification.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )} */}

                {userType === 'superadmin' && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-amber-800">
                                    SuperAdmin Access
                                </h3>
                                <div className="mt-2 text-sm text-amber-700">
                                    <p>Restricted access for SuperAdmin users only</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignIn;