import React, { useState, useRef, useEffect } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import toast from 'react-hot-toast';
import { apiRequest } from '../utils/api';
import Loader from '../components/ui/Loader';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('notification');
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showCreateCouponForm, setShowCreateCouponForm] = useState(false);
  const [showCreateNotificationForm, setShowCreateNotificationForm] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();
  const notificationFileInputRef = useRef();

  const outletId = localStorage.getItem('outletId');

  const [notificationFormData, setNotificationFormData] = useState({
    title: '',
    priority: '',
    message: '',
    scheduledDate: '',
    scheduledTime: '',
    imageUrl: null,
  });

  const [promotionFormData, setPromotionFormData] = useState({
    title: '',
    type: '',
    description: '',
    scheduleDate: '',
    scheduleTime: '',
    image: null,
  });

  const [couponFormData, setCouponFormData] = useState({
    code: '',
    description: '',
    rewardValue: '',
    minOrderValue: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
  });

  const [autoSend, setAutoSend] = useState(false);

  const couponHeaders = ["Code", "Description", "Reward", "Min Order", "Valid Until", "Usage", "Actions"];
  const notificationHeaders = ["Title", "Message", "Priority", "Scheduled At", "Status", "Actions"];

  // Fetch coupons on component mount and when tab changes to coupon
  useEffect(() => {
    if (activeTab === 'coupon') {
      fetchCoupons();
    } else if (activeTab === 'notification') {
      fetchScheduledNotifications();
    }
  }, [activeTab]);

  const fetchScheduledNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const data = await apiRequest(`/superadmin/notifications/scheduled/${outletId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      setScheduledNotifications(data.data);
    } catch (error) {
      console.error('Error fetching scheduled notifications:', error);
      toast.error(error.message || 'Error fetching scheduled notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const data = await apiRequest(`/superadmin/get-coupons/${outletId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      setCoupons(data.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error(error.message || 'Error fetching coupons');
    } finally {
      setLoading(false);
    }
  };

  const deleteCoupon = async (couponId) => {
    try {
      const token = localStorage.getItem('token');
      await apiRequest(`/superadmin/delete-coupon/${couponId}/`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error(error.message || 'Error deleting coupon');
    }
  };

  const cancelScheduledNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await apiRequest(`/superadmin/notifications/scheduled/${notificationId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      toast.success('Scheduled notification cancelled successfully');
      fetchScheduledNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling notification:', error);
      toast.error(error.message || 'Error cancelling notification');
    }
  };

  const couponData = coupons.slice().reverse().map(coupon => [
    coupon.code,
    coupon.description || 'No description',
    `${coupon.rewardValue * 100}%`,
    `₹${coupon.minOrderValue}`,
    new Date(coupon.validUntil).toLocaleDateString(),
    `${coupon.usedCount}/${coupon.usageLimit}`,
    <div className="text-right">
      <Button
        variant="danger"
        onClick={() => deleteCoupon(coupon.id)}
        disabled={loading}
      >
        Remove
      </Button>
    </div>
  ]);

  const notificationData = scheduledNotifications.slice()
    .reverse().map(notification => [
      notification.title,
      notification.message.length > 50 ? `${notification.message.substring(0, 50)}...` : notification.message,
      <span className={`px-2 py-1 rounded text-xs ${notification.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
        notification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
        {notification.priority}
      </span>,
      new Date(notification.scheduledAt).toLocaleString(),
      <span className={`px-2 py-1 rounded text-xs ${notification.isSent ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
        {notification.isSent ? 'Sent' : 'Scheduled'}
      </span>,
      <div className="text-right">
        {!notification.isSent && (
          <Button
            variant="danger"
            onClick={() => cancelScheduledNotification(notification.id)}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
      </div>
    ]);

  const handleNotificationChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'imageUrl') {
      setNotificationFormData(prev => ({ ...prev, imageUrl: files[0] }));
    } else {
      setNotificationFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePromotionChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setPromotionFormData(prev => ({ ...prev, image: files[0] }));
    } else {
      setPromotionFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCouponChange = (e) => {
    const { name, value } = e.target;
    setCouponFormData(prev => ({ ...prev, [name]: value }));
  };

  const uploadNotificationImage = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5500/api';
    const resp = await fetch(`${apiBase}/superadmin/notifications/upload-image`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      credentials: 'include',
      body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Image upload failed');
    return data.imageUrl;
  };

  const handleSendImmediate = async () => {
    // Validation
    if (!notificationFormData.title || !notificationFormData.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let imageUrl = null;
      if (notificationFormData.imageUrl instanceof File) {
        imageUrl = await uploadNotificationImage(notificationFormData.imageUrl);
      }

      const payload = {
        title: notificationFormData.title.trim(),
        message: notificationFormData.message.trim(),
        outletId: parseInt(outletId),
        imageUrl: imageUrl,
        type: 'GENERAL'
      };

      await apiRequest('/superadmin/notifications/send-immediate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: payload,
      });

      toast.success('Notification sent immediately');
      setShowCreateNotificationForm(false);
      handleNotificationReset();
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      toast.error(error.message || 'Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleNotification = async () => {
    // Validation
    if (!notificationFormData.title || !notificationFormData.message ||
      !notificationFormData.scheduledDate || !notificationFormData.scheduledTime ||
      !notificationFormData.priority) {
      toast.error('Please fill all required fields for scheduling');
      return;
    }

    // Validate scheduled time is in future
    const scheduledDateTime = new Date(`${notificationFormData.scheduledDate}T${notificationFormData.scheduledTime}`);
    const now = new Date();

    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let imageUrl = null;
      if (notificationFormData.imageUrl instanceof File) {
        imageUrl = await uploadNotificationImage(notificationFormData.imageUrl);
      }

      const notificationData = {
        title: notificationFormData.title.trim(),
        message: notificationFormData.message.trim(),
        priority: notificationFormData.priority,
        scheduledDate: notificationFormData.scheduledDate,
        scheduledTime: notificationFormData.scheduledTime,
        imageUrl: imageUrl,
        outletId: parseInt(outletId),
      };

      await apiRequest('/superadmin/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: notificationData,
      });

      toast.success('Notification scheduled successfully');
      setShowCreateNotificationForm(false);
      handleNotificationReset();
      fetchScheduledNotifications();
    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast.error(error.message || 'Error scheduling notification');
    } finally {
      setLoading(false);
    }
  };

  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    if (!promotionFormData.title || !promotionFormData.description) {
      toast.error('Title and description are required');
      return;
    }

    try {
      setLoading(true);
      let imageUrl = null;
      if (promotionFormData.image instanceof File) {
        imageUrl = await uploadNotificationImage(promotionFormData.image);
      }

      const token = localStorage.getItem('token');
      const payload = {
        title: promotionFormData.title.trim(),
        message: promotionFormData.description.trim(),
        outletId: parseInt(outletId),
        imageUrl: imageUrl,
        type: 'PROMOTION'
      };

      // If scheduled
      if (promotionFormData.scheduleDate && promotionFormData.scheduleTime) {
         await apiRequest('/superadmin/notifications/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
          body: {
            ...payload,
            priority: promotionFormData.type?.toUpperCase() || 'MEDIUM',
            scheduledDate: promotionFormData.scheduleDate,
            scheduledTime: promotionFormData.scheduleTime
          },
        });
        toast.success('Promotion scheduled successfully');
        fetchScheduledNotifications();
      } else {
        await apiRequest('/superadmin/notifications/send-immediate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
          body: payload,
        });
        toast.success('Promotion sent immediately');
      }

      handlePromotionReset();
    } catch (error) {
      console.error('Error submitting promotion:', error);
      toast.error(error.message || 'Error submitting promotion');
    } finally {
      setLoading(false);
    }
  };

const handleCouponSubmit = async (e) => {
  e.preventDefault();

  if (!couponFormData.code || !couponFormData.rewardValue || !couponFormData.validFrom ||
    !couponFormData.validUntil || !couponFormData.usageLimit) {
    toast.error('Please fill all required fields');
    return;
  }

  const validFrom = new Date(couponFormData.validFrom);
  const validUntil = new Date(couponFormData.validUntil);
  const now = new Date();

  if (validFrom < now) {
    toast.error('Valid from date cannot be in the past');
    return;
  }

  if (validUntil <= validFrom) {
    toast.error('Valid until date must be after valid from date');
    return;
  }

  if (parseFloat(couponFormData.rewardValue) <= 0) {
    toast.error('Reward value must be greater than 0');
    return;
  }

  if (parseFloat(couponFormData.minOrderValue) < 0) {
    toast.error('Minimum order value cannot be negative');
    return;
  }

  if (parseInt(couponFormData.usageLimit) <= 0) {
    toast.error('Usage limit must be greater than 0');
    return;
  }

  try {
    setLoading(true);
    const token = localStorage.getItem('token');

    const couponData = {
      code: couponFormData.code.trim().toUpperCase(),
      description: couponFormData.description.trim(),
      rewardValue: `${couponFormData.rewardValue}%`,
      minOrderValue: parseFloat(couponFormData.minOrderValue),
      validFrom: couponFormData.validFrom,
      validUntil: couponFormData.validUntil,
      usageLimit: parseInt(couponFormData.usageLimit),
      outletId: parseInt(outletId),
    };

    const result = await apiRequest('/superadmin/create-coupon/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      credentials: 'include',
      body: couponData,
    });

    toast.success('Coupon created successfully');
    setShowCreateCouponForm(false);
    handleCouponReset();
    fetchCoupons();

    if (autoSend) {
      try {
        
        const notificationData = {
          title: `🎉 New Coupon Available: ${couponFormData.code.trim().toUpperCase()}`,
          message: `Exciting news! Use coupon code "${couponFormData.code.trim().toUpperCase()}" and save ${couponFormData.rewardValue}% ${couponFormData.minOrderValue ? ` on orders above ₹${couponFormData.minOrderValue}` : ''}. Valid until ${new Date(couponFormData.validUntil).toLocaleDateString()}. Limited usage - hurry up!`,
          outletId: parseInt(outletId),
          type: 'COUPON'
        };

        await apiRequest('/superadmin/notifications/send-immediate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
          body: notificationData,
        });

        toast.success('Coupon notification sent to users successfully!');
      } catch (notificationError) {
        console.error('Error sending coupon notification:', notificationError);
        console.error('Full error details:', {
          message: notificationError.message,
          status: notificationError.status,
          response: notificationError.response
        });
        toast.error(`Coupon created but failed to send notification: ${notificationError.message || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Error creating coupon:', error);
    toast.error(error.message || 'Error creating coupon');
  } finally {
    setLoading(false);
  }
};

  const handleNotificationReset = () => {
    setNotificationFormData({
      title: '',
      priority: '',
      message: '',
      scheduledDate: '',
      scheduledTime: '',
      imageUrl: null,
    });
    if (notificationFileInputRef.current) notificationFileInputRef.current.value = null;
  };

  const handlePromotionReset = () => {
    setPromotionFormData({
      title: '',
      type: '',
      description: '',
      scheduleDate: '',
      scheduleTime: '',
      image: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleCouponReset = () => {
    setCouponFormData({
      code: '',
      description: '',
      rewardValue: '',
      minOrderValue: '',
      validFrom: '',
      validUntil: '',
      usageLimit: '',
    });
    setAutoSend(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-gray-800">Notifications</h1>

      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <Button variant={activeTab === 'notification' ? 'black' : 'secondary'} onClick={() => setActiveTab('notification')}>Notifications</Button>
          <Button variant={activeTab === 'promotion' ? 'black' : 'secondary'} onClick={() => setActiveTab('promotion')}>Promotion</Button>
          <Button variant={activeTab === 'coupon' ? 'black' : 'secondary'} onClick={() => setActiveTab('coupon')}>Coupons</Button>
        </div>
      </div>

      {/* Notification Tab */}
      {activeTab === 'notification' && (
        <div className='pb-5'>
          <Card title={
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {showCreateNotificationForm ? 'Create Notification' : 'Scheduled Notification'}
              </h2>
              <div className="flex justify-end items-center space-x-2">
                {!showCreateNotificationForm ? (
                  <Button
                    variant="success"
                    onClick={() => setShowCreateNotificationForm(true)}
                  >
                    Create Notification
                  </Button>
                ) : (
                  <Button
                    variant="black"
                    onClick={() => setShowCreateNotificationForm(false)}
                  >
                    Back
                  </Button>
                )}
              </div>

            </div>
          }>
            {!showCreateNotificationForm ? (
              <>
                {/* <h3 className="text-lg font-semibold mb-4 text-gray-700">Scheduled Notifications</h3> */}
                {loading ? (
                  <div className="flex items-center justify-center text-center py-4"><Loader /></div>
                ) : scheduledNotifications.length > 0 ? (
                  <Table headers={notificationHeaders} data={notificationData} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No scheduled notifications found. Create your first notification!
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Create Notification</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={notificationFormData.title}
                        onChange={handleNotificationChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter notification title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority Type *</label>
                      <select
                        name="priority"
                        value={notificationFormData.priority}
                        onChange={handleNotificationChange}
                        className="w-full border rounded px-3 py-2"
                        required
                      >
                        <option value="">Select Priority</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea
                      name="message"
                      value={notificationFormData.message}
                      onChange={handleNotificationChange}
                      className="w-full border rounded px-3 py-2"
                      rows="3"
                      placeholder="Enter notification message"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload</label>
                      <input
                        type="file"
                        accept="image/*"
                        name="imageUrl"
                        onChange={handleNotificationChange}
                        ref={notificationFileInputRef}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date</label>
                      <input
                        type="date"
                        name="scheduledDate"
                        value={notificationFormData.scheduledDate}
                        onChange={handleNotificationChange}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
                      <input
                        type="time"
                        name="scheduledTime"
                        value={notificationFormData.scheduledTime}
                        onChange={handleNotificationChange}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        handleNotificationReset();
                        setShowCreateNotificationForm(false);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="black"
                      onClick={handleSendImmediate}
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Now'}
                    </Button>
                    <Button
                      type="button"
                      variant="success"
                      onClick={handleScheduleNotification}
                      disabled={loading}
                    >
                      {loading ? 'Scheduling...' : 'Schedule'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Promotion Tab */}
      {activeTab === 'promotion' && (
        <Card title="Promotion Details">
          <form className="space-y-4" onSubmit={handlePromotionSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" name="title" value={promotionFormData.title} onChange={handlePromotionChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority Type</label>
                <select name="type" value={promotionFormData.type} onChange={handlePromotionChange} className="w-full border rounded px-3 py-2">
                  <option value="">Select Type</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" value={promotionFormData.description} onChange={handlePromotionChange} className="w-full border rounded px-3 py-2" rows="2" placeholder="Enter description" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload</label>
                <input type="file" accept="image/*" name="image" onChange={handlePromotionChange} ref={fileInputRef} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date</label>
                <input type="date" name="scheduleDate" value={promotionFormData.scheduleDate} onChange={handlePromotionChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
                <input type="time" name="scheduleTime" value={promotionFormData.scheduleTime} onChange={handlePromotionChange} className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="danger" onClick={handlePromotionReset}>Reset</Button>
              <Button type="submit" variant="success">Send Promotion</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Coupon Tab */}
      {activeTab === 'coupon' && (
        <div className='pb-5'>
          <Card title={
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {showCreateCouponForm ? 'Create Coupon' : 'Active Coupons'}
              </h2>
              <div className="flex space-x-2">
                {!showCreateCouponForm ? (
                  <Button
                    variant="success"
                    onClick={() => setShowCreateCouponForm(true)}
                  >
                    Create Coupon
                  </Button>
                ) : (
                  <Button
                    variant="black"
                    onClick={() => setShowCreateCouponForm(false)}
                  >
                    Back
                  </Button>
                )}
              </div>
            </div>
          }>
            {!showCreateCouponForm ? (
              <>
                {loading ? (
                  <div className="flex items-center justify-center text-center py-4"><Loader /></div>
                ) : coupons.length > 0 ? (
                  <Table headers={couponHeaders} data={couponData} className="border rounded mb-4" />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No active coupons found. Create your first coupon!
                  </div>
                )}
              </>
            ) : (
              <>
                <form className="space-y-4" onSubmit={handleCouponSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                      <input
                        type="text"
                        name="code"
                        value={couponFormData.code}
                        onChange={handleCouponChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="e.g., SAVE20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reward Value %*</label>
                      <input
                        type="number"
                        name="rewardValue"
                        value={couponFormData.rewardValue}
                        onChange={handleCouponChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="e.g., 20"
                        min="1"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={couponFormData.description}
                      onChange={handleCouponChange}
                      rows="2"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Describe your coupon offer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Value (₹)</label>
                      <input
                        type="number"
                        name="minOrderValue"
                        value={couponFormData.minOrderValue}
                        onChange={handleCouponChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="e.g., 100"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit *</label>
                      <input
                        type="number"
                        name="usageLimit"
                        value={couponFormData.usageLimit}
                        onChange={handleCouponChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="e.g., 100"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
                      <input
                        type="datetime-local"
                        name="validFrom"
                        value={couponFormData.validFrom}
                        onChange={handleCouponChange}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                      <input
                        type="datetime-local"
                        name="validUntil"
                        value={couponFormData.validUntil}
                        onChange={handleCouponChange}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-4">
                    <label className="text-sm font-medium text-gray-700">Auto Send Notification</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoSend}
                        onChange={() => setAutoSend(!autoSend)}
                      />
                      <div className="w-11 h-6 bg-black rounded-full peer peer-focus:ring-2 peer-checked:bg-theme after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        handleCouponReset();
                        setShowCreateCouponForm(false);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Coupon'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Notifications;