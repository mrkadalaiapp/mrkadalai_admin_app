import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { apiRequest } from '../utils/api';
import Loader from '../components/ui/Loader';

const Ticket = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketsData, setTicketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [priorityFilter, setPriorityFilter] = useState('all');

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicketForView, setSelectedTicketForView] = useState(null);

  const [selectedTicketForChat, setSelectedTicketForChat] = useState(null);
  const [chatReplies, setChatReplies] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const outletId = localStorage.getItem('outletId');

  useEffect(() => {
    fetchTickets();
  }, [outletId]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/superadmin/outlets/tickets/${outletId}`);

      const transformedTickets = response.tickets.map(ticket => ({
        ticketId: `#TCK${ticket.ticketId.toString().padStart(3, '0')}`,
        date: new Date(ticket.createdAt).toLocaleDateString('en-GB').replaceAll('/', '-'),
        description: ticket.description,
        raisedBy: ticket.customerName,
        customerEmail: ticket.customerEmail,
        customerPhone: ticket.customerPhone || 'N/A',
        priority: ticket.priority.toLowerCase(),
        status: ticket.status.toLowerCase(),
        originalId: ticket.ticketId,
        resolutionNote: ticket.resolutionNote || null,
        resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString().split('T')[0] : null
      }));

      setTicketsData(transformedTickets);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalTickets = ticketsData.length;
  const openTickets = ticketsData.filter(ticket => ticket.status === 'open').length;
  const closedTickets = ticketsData.filter(ticket => ticket.status === 'closed').length;

  // Filter tickets based on search query
  const filteredTickets = ticketsData.filter(ticket => {
    const matchesSearch = ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.raisedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const formatDateWithSlashes = (dateString) => {
    if (!dateString) return 'N/A';

    // If dateString contains '-' or '/'
    const parts = dateString.includes('-') ? dateString.split('-') : dateString.split('/');

    if (parts.length !== 3) return 'N/A';

    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  };


  // const filteredTickets = ticketsData.filter(ticket =>
  //   ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   ticket.raisedBy.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  // Map tickets data for the table with two action buttons (View & Chat)
  const searchTicketData = filteredTickets
    .slice()      // create a shallow copy to avoid mutating the original array
    .reverse()    // reverse the order
    .map(ticket => [
      ticket.ticketId,
      formatDateWithSlashes(ticket.date),
      <div 
        className="max-w-xs whitespace-normal break-words cursor-pointer hover:text-blue-600"
        onClick={() => {
          setSelectedTicketForView(ticket);
          setShowViewModal(true);
        }}
        title="Click to view full details"
      >
        {ticket.description}
      </div>,
      ticket.raisedBy,
      <Badge variant={ticket.priority} key={`${ticket.ticketId}-priority`}>
        {ticket.priority}
      </Badge>,
      <Badge variant={ticket.status} key={`${ticket.ticketId}-status`}>
        {ticket.status}
      </Badge>,
      <div className="flex space-x-2" key={ticket.ticketId}>
        <Button
          onClick={() => {
            setSelectedTicketForView(ticket);
            setShowViewModal(true);
          }}
        >
          View
        </Button>
        <Button
          onClick={() => {
            setSelectedTicketForChat(ticket);
            setChatInput(chatReplies[ticket.ticketId] || '');
          }}
          disabled={ticket.status === 'closed'}
        >
          Chat
        </Button>
      </div>
    ]);


  const closeViewModal = () => {
    setSelectedTicketForView(null);
    setShowViewModal(false);
  };

  const closeChatModal = () => {
    setSelectedTicketForChat(null);
    setChatInput('');
  };

  const sendChatReply = async () => {
    if (chatInput.trim() === '' || !selectedTicketForChat) return;

    try {
      setSendingReply(true);

      await apiRequest('/superadmin/outlets/ticket-close/', {
        method: 'POST',
        body: {
          ticketId: selectedTicketForChat.originalId,
          resolutionNote: chatInput.trim(),
          resolvedAt: new Date().toISOString()
        }
      });

      // Update local state
      setChatReplies(prev => ({
        ...prev,
        [selectedTicketForChat.ticketId]: chatInput.trim()
      }));

      // Update ticket status in local state
      setTicketsData(prev => prev.map(ticket =>
        ticket.ticketId === selectedTicketForChat.ticketId
          ? {
            ...ticket,
            status: 'closed',
            resolutionNote: chatInput.trim(),
            resolvedAt: new Date().toISOString().split('T')[0]
          }
          : ticket
      ));

      // Update selected ticket
      setSelectedTicketForChat(prev => ({ ...prev, status: 'closed' }));
      setChatInput('');

    } catch (err) {
      console.error('Error closing ticket:', err);
      setError(err.message || 'Failed to close ticket');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Ticket Management</h1>
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Ticket Management</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={fetchTickets}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Ticket Management</h1>

      {/* KPI Cards removed per request */}

      <div className="flex justify-end items-center mb-4 flex-wrap gap-2">
        {/* <h2 className="text-lg font-semibold text-gray-800">Ticket Details</h2> */}
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border rounded p-2"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="text"
            placeholder="Search by Id, description or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded p-2 w-64"
          />
          <Button variant='black' onClick={fetchTickets}>Refresh</Button>
        </div>
      </div>

      <div className='pb-5'>
        <Card title='Ticket Details'>
          <Table
            headers={[
              'Ticket Id',
              'Date',
              'Ticket Description',
              'Ticket Raised by',
              'Priority',
              'Status',
              'Actions'
            ]}
            data={searchTicketData}
          />
        </Card>
      </div>

      {/* View Modal */}
      {showViewModal && selectedTicketForView && (
        <Modal
          isOpen={true}
          onClose={closeViewModal}
          title={`Ticket Details: ${selectedTicketForView.ticketId}`}
          footer={<Button onClick={closeViewModal}>Close</Button>}
        >
          <div className="space-y-2">
            <p><strong>Date:</strong> {selectedTicketForView.date}</p>
            <p><strong>Description:</strong> {selectedTicketForView.description}</p>
            <p><strong>Raised By:</strong> {selectedTicketForView.raisedBy}</p>
            <p><strong>Phone Number:</strong> {selectedTicketForView.customerPhone}</p>
            <p><strong>Email:</strong> {selectedTicketForView.customerEmail}</p>
            <p><strong>Priority:</strong> {selectedTicketForView.priority}</p>
            <p><strong>Status:</strong> {selectedTicketForView.status}</p>
            {selectedTicketForView.status === 'closed' && selectedTicketForView.resolutionNote && (
              <>
                <p><strong>Resolved At:</strong> {selectedTicketForView.resolvedAt}</p>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p><strong>Resolution:</strong></p>
                  <p className="text-gray-700 mt-1">{selectedTicketForView.resolutionNote}</p>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Chat Modal */}
      {selectedTicketForChat && (
        <Modal
          isOpen={true}
          onClose={closeChatModal}
          title={`Chat: ${selectedTicketForChat.ticketId}`}
          footer={
            selectedTicketForChat.status === 'open' && !chatReplies[selectedTicketForChat.ticketId] ? (
              <Button onClick={sendChatReply} disabled={sendingReply}>
                {sendingReply ? 'Sending...' : 'Send & Close Ticket'}
              </Button>
            ) : (
              <Button onClick={closeChatModal}>Close</Button>
            )
          }
        >
          <div className="h-96 flex flex-col border rounded-lg overflow-hidden">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {/* Customer message */}
              <div className="flex">
                <div className="bg-white px-4 py-2 rounded-lg shadow text-gray-800 max-w-xs">
                  <p className="text-sm">{selectedTicketForChat.description}</p>
                  <p className="text-xs text-right text-gray-400 mt-1">
                    {selectedTicketForChat.raisedBy}
                  </p>
                </div>
              </div>

              {/* Admin reply if exists */}
              {chatReplies[selectedTicketForChat.ticketId] && (
                <div className="flex justify-end">
                  <div className="bg-green-100 px-4 py-2 rounded-lg shadow text-gray-900 max-w-xs">
                    <p className="text-sm">{chatReplies[selectedTicketForChat.ticketId]}</p>
                    <p className="text-xs text-right text-gray-600 mt-1">You</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input box (only if admin can reply) */}
            {selectedTicketForChat.status === 'open' &&
              !chatReplies[selectedTicketForChat.ticketId] && (
                <div className="border-t p-3 bg-white">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your resolution message..."
                    className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-100"
                    disabled={sendingReply}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !sendingReply) {
                        sendChatReply();
                      }
                    }}
                  />
                </div>
              )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Ticket;