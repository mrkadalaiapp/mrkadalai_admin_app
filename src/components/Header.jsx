import React, { useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu, LogOut } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'

const Header = ({ onMenuClick }) => {
    const { user, signOut } = useContext(AuthContext)
    const location = useLocation();

    useEffect(() => {
        if (location.pathname === '/') {
            localStorage.removeItem('outletName');
            localStorage.removeItem('outletId');
        }
    }, [location.pathname]);


    // !  Extract email from the (context) instaed of the name as of now 
    const userName = user?.email?.split('@')[0] || 'Guest'

    const outletName = localStorage.getItem('outletName');

    return (
        <header className="bg-header shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Mobile menu button */}
                    <button
                        type="button"
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <img src={'https://ezjbzdcdqvarkkbteptl.supabase.co/storage/v1/object/public/images/logo3.png'} alt="logo" className="h-8 w-auto" />
                        {outletName && (
                            <span className="text-sm sm:text-base font-semibold text-gray-700">
                                {outletName}
                            </span>
                        )}
                    </div>

                    {/* Left Section  - SearchBar */}
                    {/* <div className="flex-1 max-w-md mx-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Search orders, customers..."
                            />
                        </div>
                    </div> */}

                    {/* Right Section */}
                    <div className="flex items-center space-x-2 sm:space-x-4">



                        {/* Profile */}
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-theme flex items-center justify-center">
                                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">{userName}</div>
                                <div className="text-xs text-gray-500">Admin</div>
                            </div>
                        </div>
                        {location.pathname === '/' && (
                            <button
                                onClick={signOut}
                                className="relative p-2 border-2 border-black rounded-full text-black hover:bg-black hover:text-white transition"
                            >
                                <LogOut className="h-3 w-3 sm:h-3 sm:w-3" />
                            </button>
                        )}


                        {/* Logout button */}
                        {/* <button
                            onClick={signOut}
                            className="ml-2 px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Logout
                        </button> */}
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
