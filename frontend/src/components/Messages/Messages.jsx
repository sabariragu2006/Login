import React, { useEffect, useState } from 'react';

const Messages = ({ user, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');

  const fetchConversations = async () => {
    try {
      const response = await fetch(`http://localhost:5000/conversations/${user._id}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      alert('Failed to load conversations');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/users?excludeId=${user._id}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      alert('Failed to load users');
    }
  };

  const fetchMessages = async (targetUserId) => {
    try {
      setFetchingMessages(true);
      const response = await fetch(`http://localhost:5000/messages/${user._id}/${targetUserId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      alert('Failed to load messages');
    } finally {
      setFetchingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const response = await fetch('http://localhost:5000/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          senderId: user._id,
          receiverId: selectedUser._id,
          text: newMessage.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      setNewMessage('');
      fetchMessages(selectedUser._id);
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.message || 'Failed to send message');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchConversations(),
      fetchAllUsers()
    ]).finally(() => {
      setLoading(false);
    });
  }, [user._id]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    const container = document.getElementById('messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  const findConversation = (userId) => {
    return conversations.find(conv => conv._id === userId);
  };

  // --- SAFETY: Prevent crash on undefined user ---
  if (!user) return null;

  return (
    <>
      {/* Overlay — covers entire screen */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060,
          padding: '20px',
        }}
      >
        {/* Modal Content — centered, scrollable */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '20px',
            width: '95%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ borderBottom: '1px solid #eee' }}>
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-chat-dots me-2"></i>
              Messages
            </h5>
            <button
              onClick={onClose}
              className="btn btn-sm"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="modal-body p-0">
            <div className="row g-0" style={{ height: '60vh' }}>
              {/* Left Sidebar - Users/Conversations */}
              <div className="col-md-4 border-end">
                <div className="p-3 border-bottom">
                  <div className="d-flex gap-2 mb-3">
                    <button
                      className={`btn btn-sm ${activeTab === 'conversations' ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill flex-grow-1`}
                      onClick={() => setActiveTab('conversations')}
                    >
                      Conversations
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill flex-grow-1`}
                      onClick={() => setActiveTab('all')}
                    >
                      All Users
                    </button>
                  </div>
                  <h6 className="mb-0">
                    {activeTab === 'conversations' ? 'Your Conversations' : 'All Users'}
                  </h6>
                </div>
                <div style={{ height: 'calc(60vh - 100px)', overflowY: 'auto' }}>
                  {loading ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : activeTab === 'conversations' ? (
                    conversations.length === 0 ? (
                      <div className="text-center text-muted py-5">
                        <i className="bi bi-chat-left-text" style={{ fontSize: '2rem' }}></i>
                        <p className="mt-2">No conversations yet</p>
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv._id}
                          className={`p-3 d-flex align-items-center cursor-pointer ${
                            selectedUser?._id === conv._id ? 'bg-light' : ''
                          }`}
                          onClick={() => setSelectedUser({
                            _id: conv._id,
                            name: conv.name,
                            profilePicture: conv.profilePicture
                          })}
                          style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        >
                          <img
                            src={conv.profilePicture ? `http://localhost:5000${conv.profilePicture}` : `https://via.placeholder.com/40x40/667eea/white?text=${conv.name.charAt(0) || '?'}`}
                            alt={conv.name}
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div className="flex-grow-1">
                            <h6 className="mb-0 fw-bold">{conv.name}</h6>
                            <p className="mb-0 text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                              {conv.lastMessage}
                            </p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="badge bg-primary rounded-pill">{conv.unreadCount}</span>
                          )}
                          <small className="text-muted ms-2" style={{ fontSize: '0.7rem' }}>
                            {formatDate(conv.lastMessageAt)}
                          </small>
                        </div>
                      ))
                    )
                  ) : (
                    allUsers.length === 0 ? (
                      <div className="text-center text-muted py-5">
                        <i className="bi bi-people" style={{ fontSize: '2rem' }}></i>
                        <p className="mt-2">No users found</p>
                      </div>
                    ) : (
                      allUsers.map((otherUser) => {
                        const conversation = findConversation(otherUser._id);
                        return (
                          <div
                            key={otherUser._id}
                            className={`p-3 d-flex align-items-center cursor-pointer ${
                              selectedUser?._id === otherUser._id ? 'bg-light' : ''
                            }`}
                            onClick={() => setSelectedUser({
                              _id: otherUser._id,
                              name: otherUser.name,
                              profilePicture: otherUser.profilePicture
                            })}
                            style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                          >
                            <img
                              src={otherUser.profilePicture ? `http://localhost:5000${otherUser.profilePicture}` : `https://via.placeholder.com/40x40/667eea/white?text=${otherUser.name.charAt(0) || '?'}`}
                              alt={otherUser.name}
                              className="rounded-circle me-3"
                              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            <div className="flex-grow-1">
                              <h6 className="mb-0 fw-bold">{otherUser.name}</h6>
                              {conversation ? (
                                <p className="mb-0 text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                                  {conversation.lastMessage}
                                </p>
                              ) : (
                                <p className="mb-0 text-muted small">Start a conversation</p>
                              )}
                            </div>
                            {conversation && conversation.unreadCount > 0 && (
                              <span className="badge bg-primary rounded-pill">{conversation.unreadCount}</span>
                            )}
                            {conversation && (
                              <small className="text-muted ms-2" style={{ fontSize: '0.7rem' }}>
                                {formatDate(conversation.lastMessageAt)}
                              </small>
                            )}
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>

              {/* Right Panel - Chat */}
              <div className="col-md-8 d-flex flex-column">
                {selectedUser ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3 border-bottom d-flex align-items-center">
                      <img
                        src={selectedUser.profilePicture ? `http://localhost:5000${selectedUser.profilePicture}` : `https://via.placeholder.com/35x35/667eea/white?text=${selectedUser.name.charAt(0) || '?'}`}
                        alt={selectedUser.name}
                        className="rounded-circle me-3"
                        style={{ width: '35px', height: '35px', objectFit: 'cover' }}
                      />
                      <h6 className="mb-0 fw-bold">{selectedUser.name}</h6>
                    </div>

                    {/* Messages Container */}
                    <div
                      id="messages-container"
                      className="flex-grow-1 p-3 overflow-y-auto"
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                      {fetchingMessages ? (
                        <div className="d-flex justify-content-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading messages...</span>
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <i className="bi bi-chat" style={{ fontSize: '2rem' }}></i>
                          <p className="mt-2">No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((msg, index) => (
                          <div
                            key={index}
                            className={`d-flex mb-3 ${msg.sender._id === user._id ? 'justify-content-end' : 'justify-content-start'}`}
                          >
                            {msg.sender._id !== user._id && (
                              <img
                                src={msg.sender.profilePicture ? `http://localhost:5000${msg.sender.profilePicture}` : `https://via.placeholder.com/28x28/667eea/white?text=${msg.sender.name.charAt(0) || '?'}`}
                                alt={msg.sender.name}
                                className="rounded-circle me-2"
                                style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                              />
                            )}
                            <div
                              className={`px-3 py-2 rounded-3 ${
                                msg.sender._id === user._id
                                  ? 'bg-primary text-white'
                                  : 'bg-white text-dark'
                              }`}
                              style={{
                                maxWidth: '70%',
                                wordBreak: 'break-word'
                              }}
                            >
                              <p className="mb-0">{msg.text}</p>
                              <small className={`mt-1 d-block ${
                                msg.sender._id === user._id ? 'text-white-50' : 'text-muted'
                              }`} style={{ fontSize: '0.7rem' }}>
                                {formatDate(msg.createdAt)}
                              </small>
                            </div>
                            {msg.sender._id === user._id && (
                              <img
                                src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : `https://via.placeholder.com/28x28/667eea/white?text=${user.name.charAt(0) || '?'}`}
                                alt="You"
                                className="rounded-circle ms-2"
                                style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-3 border-top">
                      <form onSubmit={handleSendMessage} className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control rounded-pill"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          style={{ fontSize: '0.9rem' }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary rounded-pill px-4"
                          disabled={!newMessage.trim()}
                        >
                          <i className="bi bi-send"></i>
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <div className="text-center text-muted">
                      <i className="bi bi-chat-square" style={{ fontSize: '3rem' }}></i>
                      <h5 className="mt-3">Select a user</h5>
                      <p className="mb-0">Choose someone to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="d-flex justify-content-end p-3 border-top" style={{ borderTop: '1px solid #eee' }}>
            <button
              type="button"
              className="btn btn-secondary rounded-pill px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Messages;