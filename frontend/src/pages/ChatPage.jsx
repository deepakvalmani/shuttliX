import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Send, Search, Plus, X, Users, ArrowLeft,
  Check, CheckCheck, Trash2, Reply, MoreVertical,
  MessageSquare, UserCircle, Bus, ShieldCheck,
  Image, Paperclip, Smile,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';

// ── ROLE ICON ─────────────────────────────────────────────
const RoleIcon = ({ role, size = 12 }) => {
  if (role === 'admin' || role === 'superadmin') return <ShieldCheck size={size} style={{ color: '#8B5CF6' }} />;
  if (role === 'driver') return <Bus size={size} style={{ color: '#10B981' }} />;
  return <UserCircle size={size} style={{ color: 'var(--brand)' }} />;
};

// ── AVATAR ────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const colors = {
    admin: '#8B5CF6', superadmin: '#8B5CF6',
    driver: '#10B981', student: '#1A56DB',
  };
  const color = colors[user?.role] || 'var(--brand)';
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
};

// ── MESSAGE BUBBLE ────────────────────────────────────────
const MessageBubble = ({ msg, isMine, onDelete, onReply }) => {
  const [showMenu, setShowMenu] = useState(false);
  const time = new Date(msg.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex gap-2 mb-3 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && <Avatar user={msg.sender} size={28} />}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {!isMine && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{msg.sender?.name}</span>
            <RoleIcon role={msg.sender?.role} />
          </div>
        )}

        {/* Reply preview */}
        {msg.replyTo && !msg.isDeleted && (
          <div className="px-3 py-1.5 rounded-xl mb-1 text-xs"
            style={{ background: 'var(--glass-1)', borderLeft: '3px solid var(--brand)', color: 'var(--text-3)', maxWidth: '100%' }}>
            <p className="font-semibold" style={{ color: 'var(--brand)' }}>{msg.replyTo.sender?.name}</p>
            <p className="truncate">{msg.replyTo.content}</p>
          </div>
        )}

        <div className="relative">
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={{
              background: isMine ? 'var(--brand)' : 'var(--glass-2)',
              color: isMine ? 'white' : 'var(--text-1)',
              border: isMine ? 'none' : '1px solid var(--border)',
              opacity: msg.isDeleted ? 0.6 : 1,
              fontStyle: msg.isDeleted ? 'italic' : 'normal',
            }}>
            {msg.content}
          </div>

          {/* Context menu */}
          {!msg.isDeleted && (
            <div className={`absolute top-0 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} 
              opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
              <button onClick={() => onReply(msg)} className="btn-ghost btn-icon p-1"
                style={{ background: 'var(--glass-2)', border: '1px solid var(--border)' }}>
                <Reply size={11} />
              </button>
              {isMine && (
                <button onClick={() => { onDelete(msg._id); setShowMenu(false); }} className="btn-ghost btn-icon p-1"
                  style={{ background: 'var(--glass-2)', border: '1px solid var(--border)', color: '#EF4444' }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--text-4)' }}>{time}</span>
          {isMine && !msg.isDeleted && (
            msg.readBy?.length > 1
              ? <CheckCheck size={11} style={{ color: '#3B82F6' }} />
              : <Check size={11} style={{ color: 'var(--text-4)' }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ── ROOM LIST ITEM ────────────────────────────────────────
const RoomItem = ({ room, currentUserId, isActive, onClick, unread }) => {
  const otherMember = room.type === 'direct'
    ? room.members?.find(m => m._id !== currentUserId)
    : null;
  const name = room.type === 'group' ? room.name : otherMember?.name || 'Chat';
  const lastMsg = room.lastMessage?.content || 'No messages yet';

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
      style={{
        background: isActive ? 'rgba(26,86,219,0.1)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
      }}
      onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--glass-2)')}
      onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}>
      <div className="relative flex-shrink-0">
        {room.type === 'group'
          ? <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(26,86,219,0.2)', border: '1px solid rgba(26,86,219,0.4)' }}>
              <Users size={18} style={{ color: 'var(--brand)' }} />
            </div>
          : <Avatar user={otherMember} size={40} />}
        {unread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: '#EF4444', fontSize: 10 }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{name}</p>
          {room.lastMessageAt && (
            <span className="text-xs flex-shrink-0 ml-1" style={{ color: 'var(--text-4)' }}>
              {new Date(room.lastMessageAt).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' })}
            </span>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{lastMsg}</p>
      </div>
    </button>
  );
};

// ── NEW CHAT MODAL ────────────────────────────────────────
const NewChatModal = ({ users, onDirect, onGroup, onClose }) => {
  const [mode, setMode] = useState('direct'); // direct | group
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (u) => {
    setSelectedUsers(prev => prev.find(x => x._id === u._id) ? prev.filter(x => x._id !== u._id) : [...prev, u]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--glass-2)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold" style={{ color: 'var(--text-1)' }}>New conversation</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="flex gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {['direct', 'group'].map(m => (
            <button key={m} onClick={() => { setMode(m); setSelectedUsers([]); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all"
              style={{ background: mode === m ? 'var(--brand)' : 'var(--glass-2)', color: mode === m ? 'white' : 'var(--text-3)' }}>
              {m === 'direct' ? '1-to-1 Chat' : 'Group Chat'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {mode === 'group' && (
            <input className="input" placeholder="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} />
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-4)' }} />
            <input className="input pl-9" placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map(u => (
                <div key={u._id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(26,86,219,0.15)', border: '1px solid rgba(26,86,219,0.3)', color: 'var(--brand)' }}>
                  {u.name}
                  <button onClick={() => toggleUser(u)}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
            {filtered.map(u => (
              <button key={u._id}
                onClick={() => mode === 'direct' ? onDirect(u._id) : toggleUser(u)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: selectedUsers.find(x => x._id === u._id) ? 'rgba(26,86,219,0.08)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
                onMouseLeave={e => e.currentTarget.style.background = selectedUsers.find(x => x._id === u._id) ? 'rgba(26,86,219,0.08)' : 'transparent'}>
                <Avatar user={u} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                  <div className="flex items-center gap-1">
                    <RoleIcon role={u.role} />
                    <span className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{u.role}</span>
                  </div>
                </div>
                {mode === 'group' && selectedUsers.find(x => x._id === u._id) && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--brand)' }}>
                    <Check size={11} color="white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {mode === 'group' && (
            <button
              onClick={() => { if (groupName && selectedUsers.length) onGroup(groupName, selectedUsers.map(u => u._id)); }}
              disabled={!groupName || !selectedUsers.length}
              className="btn-primary w-full">
              Create group ({selectedUsers.length} members)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// ── MAIN CHAT PAGE ────────────────────────────────────
// ═══════════════════════════════════════════════════════
const ChatPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimerRef = useRef(null);

  // Load rooms and users
  useEffect(() => {
    api.get('/chat/rooms').then(r => setRooms(r.data.data || [])).catch(() => {});
    api.get('/chat/users').then(r => setAllUsers(r.data.data || [])).catch(() => {});
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('chat:message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Update room last message
      setRooms(prev => prev.map(r =>
        r.roomId === msg.roomId ? { ...r, lastMessage: msg, lastMessageAt: msg.createdAt } : r
      ));
      scrollToBottom();
    });

    socket.on('chat:typing', ({ userId, roomId, isTyping }) => {
      if (userId === user._id) return;
      setTypingUsers(prev => ({
        ...prev,
        [roomId]: isTyping
          ? { ...prev[roomId], [userId]: true }
          : Object.fromEntries(Object.entries(prev[roomId] || {}).filter(([k]) => k !== userId)),
      }));
    });

    socket.on('chat:deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      ));
    });

    socket.on('chat:seen', ({ userId, messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, readBy: [...(m.readBy || []), userId] } : m
      ));
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:deleted');
      socket.off('chat:seen');
    };
  }, [user._id]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const openRoom = useCallback(async (room) => {
    if (activeRoom?.roomId === room.roomId) return;
    const socket = getSocket();

    // Leave previous room
    if (activeRoom) socket?.emit('chat:leave', { roomId: activeRoom.roomId });

    setActiveRoom(room);
    setMessages([]);
    setReplyTo(null);
    setIsLoadingMsgs(true);
    setShowSidebar(false);

    // Join new room
    socket?.emit('chat:join', { roomId: room.roomId });

    try {
      const res = await api.get(`/chat/rooms/${room.roomId}/messages`);
      setMessages(res.data.data || []);
      scrollToBottom();
    } catch { toast.error('Failed to load messages'); }
    finally { setIsLoadingMsgs(false); }
  }, [activeRoom, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeRoom) return;
    const content = newMessage.trim();
    setNewMessage('');
    setReplyTo(null);

    try {
      await api.post(`/chat/rooms/${activeRoom.roomId}/messages`, {
        content,
        replyTo: replyTo?._id,
      });
    } catch { toast.error('Failed to send'); }
  }, [newMessage, activeRoom, replyTo]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!activeRoom || !socket) return;
    socket.emit('chat:typing', { roomId: activeRoom.roomId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId: activeRoom.roomId, isTyping: false });
    }, 1500);
  }, [activeRoom]);

  const deleteMessage = useCallback(async (msgId) => {
    try { await api.delete(`/chat/messages/${msgId}`); }
    catch { toast.error('Failed to delete'); }
  }, []);

  const startDirectChat = useCallback(async (targetUserId) => {
    setShowNewChat(false);
    try {
      const res = await api.post('/chat/rooms/direct', { targetUserId });
      const room = res.data.data;
      setRooms(prev => prev.find(r => r.roomId === room.roomId) ? prev : [room, ...prev]);
      openRoom(room);
    } catch { toast.error('Failed to create chat'); }
  }, [openRoom]);

  const createGroup = useCallback(async (name, memberIds) => {
    setShowNewChat(false);
    try {
      const res = await api.post('/chat/rooms/group', { name, memberIds });
      const room = res.data.data;
      setRooms(prev => [room, ...prev]);
      openRoom(room);
    } catch { toast.error('Failed to create group'); }
  }, [openRoom]);

  const filteredRooms = rooms.filter(r => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    if (r.name?.toLowerCase().includes(q)) return true;
    const other = r.members?.find(m => m._id !== user._id);
    return other?.name?.toLowerCase().includes(q);
  });

  const activeTyping = Object.keys(typingUsers[activeRoom?.roomId] || {}).length > 0;

  const getRoomName = (room) => {
    if (room.type === 'group') return room.name;
    const other = room.members?.find(m => m._id !== user._id);
    return other?.name || 'Chat';
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <div className={`flex flex-col ${showSidebar ? 'flex' : 'hidden md:flex'} w-full md:w-[320px] md:flex-shrink-0 md:h-screen md:overflow-hidden`}
        style={{ background: 'var(--glass-2)', borderRight: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="btn-ghost btn-icon md:hidden"><ArrowLeft size={16} /></button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand)' }}>
              <MessageSquare size={16} color="white" />
            </div>
            <span className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>Messages</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={() => setShowNewChat(true)} className="btn-primary btn-icon" title="New chat">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-4)' }} />
            <input className="input pl-9 text-sm" placeholder="Search conversations..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No conversations yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Click + to start a new chat</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <RoomItem
                key={room.roomId}
                room={room}
                currentUserId={user._id}
                isActive={activeRoom?.roomId === room.roomId}
                onClick={() => openRoom(room)}
                unread={0}
              />
            ))
          )}
        </div>
      </div>

      {/* ── CHAT AREA ───────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${!showSidebar ? 'flex' : 'hidden md:flex'} h-screen`}>

        {!activeRoom ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(26,86,219,0.1)', border: '1px solid rgba(26,86,219,0.3)' }}>
              <MessageSquare size={32} style={{ color: 'var(--brand)' }} />
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--text-1)' }}>
                Select a conversation
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Choose from your conversations or start a new one
              </p>
            </div>
            <button onClick={() => setShowNewChat(true)} className="btn-primary gap-2">
              <Plus size={16} /> Start new chat
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4"
              style={{ background: 'var(--glass-2)', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setShowSidebar(true)} className="btn-ghost btn-icon md:hidden">
                <ArrowLeft size={16} />
              </button>
              <div className="relative flex-shrink-0">
                {activeRoom.type === 'group'
                  ? <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(26,86,219,0.2)' }}>
                      <Users size={18} style={{ color: 'var(--brand)' }} />
                    </div>
                  : <Avatar user={activeRoom.members?.find(m => m._id !== user._id)} size={40} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{getRoomName(activeRoom)}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {activeRoom.type === 'group'
                    ? `${activeRoom.members?.length || 0} members`
                    : activeTyping ? (
                      <span style={{ color: '#10B981' }}>typing...</span>
                    ) : 'Online'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="loader"><span /><span /><span /></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No messages yet — say hi! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      isMine={msg.sender?._id === user._id || msg.sender === user._id}
                      onDelete={deleteMessage}
                      onReply={setReplyTo}
                    />
                  ))}
                  {activeTyping && (
                    <div className="flex gap-2 items-center mb-3">
                      <div className="px-4 py-2 rounded-2xl rounded-tl-sm text-sm"
                        style={{ background: 'var(--glass-2)', border: '1px solid var(--border)' }}>
                        <div className="loader"><span /><span /><span /></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2"
                style={{ background: 'rgba(26,86,219,0.06)', borderTop: '1px solid rgba(26,86,219,0.2)' }}>
                <Reply size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>{replyTo.sender?.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="btn-ghost btn-icon p-1"><X size={12} /></button>
              </div>
            )}

            {/* Input area */}
            <div className="flex-shrink-0 px-4 py-3 flex items-end gap-3"
              style={{ background: 'var(--glass-2)', borderTop: '1px solid var(--border)' }}>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  className="input resize-none pr-4"
                  style={{ minHeight: 44, maxHeight: 120, paddingTop: 10, paddingBottom: 10 }}
                  placeholder="Type a message..."
                  rows={1}
                  value={newMessage}
                  onChange={e => {
                    setNewMessage(e.target.value);
                    handleTyping();
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="btn-primary btn-icon flex-shrink-0"
                style={{ width: 44, height: 44, borderRadius: 14 }}>
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          users={allUsers}
          onDirect={startDirectChat}
          onGroup={createGroup}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;
