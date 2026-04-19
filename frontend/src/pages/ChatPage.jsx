/**
 * pages/ChatPage.jsx  v2.0
 *
 * BUGS FIXED vs v1:
 * 1. Messages not delivering — socket.off() used store refs not named handlers,
 *    causing listeners to not be removed AND new ones to stack on re-render.
 * 2. No re-join on socket reconnect — after drop, room was lost.
 * 3. Typing indicator leaked across rooms.
 * 4. Mobile layout broken — sidebar/chat panel toggling was unreliable.
 * 5. No unread count tracking.
 * 6. Scroll-to-bottom fired before DOM updated.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Send, Search, Plus, X, Users, ArrowLeft,
  Check, CheckCheck, Trash2, Reply, MessageSquare,
  UserCircle, Bus, ShieldCheck,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';

// ── Helpers ───────────────────────────────────────────────
const roleColor = { admin: '#8B5CF6', superadmin: '#8B5CF6', driver: '#10B981', student: '#3B82F6' };

const Avatar = ({ user, size = 36 }) => {
  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg = roleColor[user?.role] || '#7C3AED';
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
};

const RoleIcon = ({ role, size = 12 }) => {
  if (role === 'admin' || role === 'superadmin') return <ShieldCheck size={size} style={{ color: '#8B5CF6' }} />;
  if (role === 'driver') return <Bus size={size} style={{ color: '#10B981' }} />;
  return <UserCircle size={size} style={{ color: '#3B82F6' }} />;
};

const fmtTime = iso =>
  new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

// ── Message Bubble ────────────────────────────────────────
const MessageBubble = ({ msg, isMine, userId, onDelete, onReply }) => (
  <div className={`flex gap-2 mb-3 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
    {!isMine && <Avatar user={msg.sender} size={28} />}

    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[78%]`}>
      {!isMine && (
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
            {msg.sender?.name}
          </span>
          <RoleIcon role={msg.sender?.role} />
        </div>
      )}

      {/* Reply preview */}
      {msg.replyTo && !msg.isDeleted && (
        <div
          className="px-3 py-1.5 rounded-xl mb-1 text-xs max-w-full"
          style={{ background: 'var(--glass-1)', borderLeft: '3px solid var(--brand)', color: 'var(--text-3)' }}
        >
          <p className="font-semibold truncate" style={{ color: 'var(--brand)' }}>
            {msg.replyTo.sender?.name}
          </p>
          <p className="truncate">{msg.replyTo.content}</p>
        </div>
      )}

      <div className="relative">
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
          style={{
            background:  isMine ? 'var(--brand)' : 'var(--glass-3)',
            color:       isMine ? 'white' : 'var(--text-1)',
            border:      isMine ? 'none' : '1px solid var(--border-1)',
            opacity:     msg.isDeleted ? 0.6 : 1,
            fontStyle:   msg.isDeleted ? 'italic' : 'normal',
            maxWidth:    '100%',
            wordBreak:   'break-word',
          }}
        >
          {msg.content}
        </div>

        {!msg.isDeleted && (
          <div
            className={`absolute top-0 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}
          >
            <button
              onClick={() => onReply(msg)}
              className="btn-ghost btn-icon p-1"
              style={{ background: 'var(--glass-3)', border: '1px solid var(--border-1)' }}
              title="Reply"
            >
              <Reply size={11} />
            </button>
            {isMine && (
              <button
                onClick={() => onDelete(msg._id)}
                className="btn-ghost btn-icon p-1"
                style={{ background: 'var(--glass-3)', border: '1px solid var(--border-1)', color: '#EF4444' }}
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-xs" style={{ color: 'var(--text-4)' }}>{fmtTime(msg.createdAt)}</span>
        {isMine && !msg.isDeleted && (
          msg.readBy?.length > 1
            ? <CheckCheck size={11} style={{ color: '#3B82F6' }} />
            : <Check size={11} style={{ color: 'var(--text-4)' }} />
        )}
      </div>
    </div>
  </div>
);

// ── Room List Item ────────────────────────────────────────
const RoomItem = ({ room, userId, isActive, onClick, unread }) => {
  const other = room.type === 'direct' ? room.members?.find(m => m._id !== userId) : null;
  const name  = room.type === 'group' ? room.name : other?.name || 'Chat';
  const last  = room.lastMessage?.isDeleted
    ? 'Message deleted'
    : room.lastMessage?.content || 'No messages yet';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
      style={{
        background:   isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
        borderBottom: '1px solid var(--border-1)',
        borderLeft:   `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
      }}
    >
      <div className="relative flex-shrink-0">
        {room.type === 'group'
          ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <Users size={18} style={{ color: 'var(--brand)' }} />
            </div>
          )
          : <Avatar user={other} size={40} />
        }
        {unread > 0 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: '#EF4444', fontSize: 10 }}
          >
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{name}</p>
          {room.lastMessageAt && (
            <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-4)' }}>
              {fmtTime(room.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: unread > 0 ? 'var(--text-2)' : 'var(--text-4)', fontWeight: unread > 0 ? 600 : 400 }}>
          {last}
        </p>
      </div>
    </button>
  );
};

// ── New Chat Modal ────────────────────────────────────────
const NewChatModal = ({ users, onDirect, onGroup, onClose }) => {
  const [mode, setMode]           = useState('direct');
  const [search, setSearch]       = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected]   = useState([]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = u =>
    setSelected(prev => prev.find(x => x._id === u._id) ? prev.filter(x => x._id !== u._id) : [...prev, u]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--bg-layer2)', border: '1px solid var(--border-2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>New conversation</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          {['direct', 'group'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelected([]); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all"
              style={{ background: mode === m ? 'var(--brand)' : 'var(--glass-2)', color: mode === m ? 'white' : 'var(--text-3)' }}
            >
              {m === 'direct' ? '1-to-1 Chat' : 'Group Chat'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {mode === 'group' && (
            <input
              className="input"
              placeholder="Group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              autoFocus
            />
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-4)' }} />
            <input className="input pl-9" placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {mode === 'group' && selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(u => (
                <div key={u._id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: 'var(--brand-light)' }}>
                  {u.name}
                  <button onClick={() => toggle(u)}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--border-1)' }}>
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-4)' }}>No users found</div>
            )}
            {filtered.map(u => (
              <button
                key={u._id}
                onClick={() => mode === 'direct' ? onDirect(u._id) : toggle(u)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{
                  borderBottom: '1px solid var(--border-1)',
                  background: selected.find(x => x._id === u._id) ? 'rgba(124,58,237,0.08)' : 'transparent',
                }}
              >
                <Avatar user={u} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                  <div className="flex items-center gap-1">
                    <RoleIcon role={u.role} />
                    <span className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{u.role}</span>
                  </div>
                </div>
                {mode === 'group' && selected.find(x => x._id === u._id) && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brand)' }}>
                    <Check size={11} color="white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {mode === 'group' && (
            <button
              onClick={() => groupName.trim() && selected.length && onGroup(groupName.trim(), selected.map(u => u._id))}
              disabled={!groupName.trim() || !selected.length}
              className="btn-primary w-full"
            >
              Create group ({selected.length} selected)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ── MAIN CHAT PAGE ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function ChatPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const typingTimer = useRef(null);

  const [rooms,        setRooms]        = useState([]);
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [newMessage,   setNewMessage]   = useState('');
  const [allUsers,     setAllUsers]     = useState([]);
  const [showNewChat,  setShowNewChat]  = useState(false);
  const [replyTo,      setReplyTo]      = useState(null);
  const [typingUsers,  setTypingUsers]  = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [sending,      setSending]      = useState(false);
  // Mobile: true = show sidebar, false = show chat
  const [showSidebar,  setShowSidebar]  = useState(true);

  const activeRoomRef = useRef(null); // ref for use inside socket handlers

  // ── Load rooms and users on mount ────────────────────
  useEffect(() => {
    api.get('/chat/rooms').then(r => setRooms(r.data.data || [])).catch(() => {});
    api.get('/chat/users').then(r => setAllUsers(r.data.data || [])).catch(() => {});
  }, []);

  // ── Socket listeners ──────────────────────────────────
  // Uses named handler functions so they can be properly removed
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = msg => {
      // Deduplicate
      setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);

      // Update last message in room list
      setRooms(prev => prev.map(r =>
        r.roomId === msg.roomId
          ? { ...r, lastMessage: msg, lastMessageAt: msg.createdAt }
          : r
      ));

      // Track unread for non-active rooms
      if (activeRoomRef.current?.roomId !== msg.roomId && msg.sender?._id !== user._id) {
        setUnreadCounts(prev => ({ ...prev, [msg.roomId]: (prev[msg.roomId] || 0) + 1 }));
      }

      // Scroll to bottom only if this is the active room
      if (activeRoomRef.current?.roomId === msg.roomId) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    };

    const handleTyping = ({ userId, roomId, isTyping }) => {
      if (userId === user._id) return;
      setTypingUsers(prev => ({
        ...prev,
        [roomId]: isTyping
          ? { ...(prev[roomId] || {}), [userId]: true }
          : Object.fromEntries(Object.entries(prev[roomId] || {}).filter(([k]) => k !== userId)),
      }));
      // Auto-clear stale typing indicator
      if (isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [roomId]: Object.fromEntries(Object.entries(prev[roomId] || {}).filter(([k]) => k !== userId)),
          }));
        }, 3000);
      }
    };

    const handleDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      ));
    };

    const handleSeen = ({ userId: uid, messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId && !m.readBy?.includes(uid)
          ? { ...m, readBy: [...(m.readBy || []), uid] }
          : m
      ));
    };

    // Re-join room on reconnect
    const handleReconnect = () => {
      if (activeRoomRef.current) {
        socket.emit('chat:join', { roomId: activeRoomRef.current.roomId });
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing',  handleTyping);
    socket.on('chat:deleted', handleDeleted);
    socket.on('chat:seen',    handleSeen);
    socket.on('reconnect',    handleReconnect);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing',  handleTyping);
      socket.off('chat:deleted', handleDeleted);
      socket.off('chat:seen',    handleSeen);
      socket.off('reconnect',    handleReconnect);
    };
  }, [user._id]);

  // ── Open a room ───────────────────────────────────────
  const openRoom = useCallback(async room => {
    if (activeRoomRef.current?.roomId === room.roomId) return;
    const socket = getSocket();

    if (activeRoomRef.current) socket?.emit('chat:leave', { roomId: activeRoomRef.current.roomId });

    setActiveRoom(room);
    activeRoomRef.current = room;
    setMessages([]);
    setReplyTo(null);
    setLoadingMsgs(true);
    setShowSidebar(false);
    setUnreadCounts(prev => ({ ...prev, [room.roomId]: 0 }));

    socket?.emit('chat:join', { roomId: room.roomId });

    try {
      const res = await api.get(`/chat/rooms/${room.roomId}/messages`);
      setMessages(res.data.data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 80);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoadingMsgs(false); }
  }, []);

  // ── Send message ──────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !activeRoom || sending) return;
    setNewMessage('');
    setReplyTo(null);
    setSending(true);

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      await api.post(`/chat/rooms/${activeRoom.roomId}/messages`, {
        content,
        replyTo: replyTo?._id || null,
      });
      // Message will arrive via socket — no need to push manually
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
      setNewMessage(content); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, activeRoom, replyTo, sending]);

  // ── Typing indicator ──────────────────────────────────
  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!activeRoom || !socket) return;
    socket.emit('chat:typing', { roomId: activeRoom.roomId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId: activeRoom.roomId, isTyping: false });
    }, 1500);
  }, [activeRoom]);

  // ── Delete message ────────────────────────────────────
  const deleteMessage = useCallback(async msgId => {
    try { await api.delete(`/chat/messages/${msgId}`); }
    catch { toast.error('Failed to delete message'); }
  }, []);

  // ── Start direct chat ─────────────────────────────────
  const startDirect = useCallback(async targetUserId => {
    setShowNewChat(false);
    try {
      const res  = await api.post('/chat/rooms/direct', { targetUserId });
      const room = res.data.data;
      setRooms(prev => prev.find(r => r.roomId === room.roomId) ? prev : [room, ...prev]);
      openRoom(room);
    } catch { toast.error('Failed to open chat'); }
  }, [openRoom]);

  // ── Create group ──────────────────────────────────────
  const createGroup = useCallback(async (name, memberIds) => {
    setShowNewChat(false);
    try {
      const res  = await api.post('/chat/rooms/group', { name, memberIds });
      const room = res.data.data;
      setRooms(prev => [room, ...prev]);
      openRoom(room);
    } catch { toast.error('Failed to create group'); }
  }, [openRoom]);

  // ── Derived ───────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    // rooms are already sorted by lastMessageAt from the server
    return rooms;
  }, [rooms]);

  const isTyping = Object.keys(typingUsers[activeRoom?.roomId] || {}).length > 0;

  const getRoomName = room => {
    if (room.type === 'group') return room.name;
    return room.members?.find(m => m._id !== user._id)?.name || 'Chat';
  };

  const getRoomOther = room =>
    room.type === 'direct' ? room.members?.find(m => m._id !== user._id) : null;

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── SIDEBAR ──────────────────────────────────── */}
      <div
        className={`
          flex flex-col flex-shrink-0 transition-transform duration-200
          w-full sm:w-[320px]
          ${showSidebar ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
          absolute sm:relative inset-y-0 left-0 z-10
        `}
        style={{
          background:   'var(--bg-layer1)',
          borderRight:  '1px solid var(--border-1)',
          height:       '100%',
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex-shrink-0 px-4 py-4 flex items-center justify-between gap-2"
          style={{ borderBottom: '1px solid var(--border-1)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} className="btn-ghost btn-icon flex-shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand)' }}
            >
              <MessageSquare size={15} color="white" />
            </div>
            <span className="font-display font-bold text-base truncate" style={{ color: 'var(--text-1)' }}>
              Messages
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggle />
            <button onClick={() => setShowNewChat(true)} className="btn-primary btn-icon" title="New chat">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--glass-2)', border: '1px solid var(--border-1)' }}>
                <MessageSquare size={22} style={{ color: 'var(--text-4)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No conversations yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Tap + to start a new chat</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <RoomItem
                key={room.roomId}
                room={room}
                userId={user._id}
                isActive={activeRoom?.roomId === room.roomId}
                onClick={() => openRoom(room)}
                unread={unreadCounts[room.roomId] || 0}
              />
            ))
          )}
        </div>
      </div>

      {/* ── CHAT AREA ─────────────────────────────────── */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 overflow-hidden
          ${!showSidebar ? 'flex' : 'hidden sm:flex'}
        `}
        style={{ height: '100%' }}
      >
        {!activeRoom ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
              <MessageSquare size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--text-1)' }}>
                No conversation selected
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Choose from your conversations or start a new one
              </p>
            </div>
            <button onClick={() => setShowNewChat(true)} className="btn-primary gap-2">
              <Plus size={16} /> New chat
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
              style={{ background: 'var(--bg-layer1)', borderBottom: '1px solid var(--border-1)' }}
            >
              <button
                onClick={() => { setShowSidebar(true); setActiveRoom(null); activeRoomRef.current = null; }}
                className="btn-ghost btn-icon sm:hidden flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="relative flex-shrink-0">
                {activeRoom.type === 'group'
                  ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(124,58,237,0.15)' }}>
                      <Users size={18} style={{ color: 'var(--brand)' }} />
                    </div>
                  )
                  : <Avatar user={getRoomOther(activeRoom)} size={40} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
                  {getRoomName(activeRoom)}
                </p>
                <p className="text-xs" style={{ color: isTyping ? 'var(--success)' : 'var(--text-3)' }}>
                  {activeRoom.type === 'group'
                    ? `${activeRoom.members?.length || 0} members`
                    : isTyping ? 'typing…' : 'Tap to view info'
                  }
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="loader"><span /><span /><span /></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: 'var(--text-4)' }}>No messages yet — say hello 👋</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      isMine={msg.sender?._id === user._id || msg.sender === user._id}
                      userId={user._id}
                      onDelete={deleteMessage}
                      onReply={setReplyTo}
                    />
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 items-center mb-3">
                      <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm"
                        style={{ background: 'var(--glass-3)', border: '1px solid var(--border-1)' }}>
                        <div className="loader"><span /><span /><span /></div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div
                className="flex-shrink-0 flex items-center gap-3 px-4 py-2"
                style={{ background: 'rgba(124,58,237,0.06)', borderTop: '1px solid rgba(124,58,237,0.2)' }}
              >
                <Reply size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                    {replyTo.sender?.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="btn-ghost btn-icon p-1 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Input */}
            <div
              className="flex-shrink-0 px-3 py-3 flex items-end gap-2"
              style={{ background: 'var(--bg-layer1)', borderTop: '1px solid var(--border-1)' }}
            >
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  className="input resize-none w-full"
                  style={{ minHeight: 44, maxHeight: 120, paddingTop: 10, paddingBottom: 10, lineHeight: 1.5 }}
                  placeholder="Type a message…"
                  rows={1}
                  value={newMessage}
                  onChange={e => {
                    setNewMessage(e.target.value);
                    handleTyping();
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="btn-primary btn-icon flex-shrink-0"
                style={{ width: 44, height: 44, borderRadius: 14, opacity: (!newMessage.trim() || sending) ? 0.5 : 1 }}
              >
                {sending
                  ? <div className="loader" style={{ gap: 3 }}><span style={{ width: 4, height: 4 }} /><span style={{ width: 4, height: 4 }} /><span style={{ width: 4, height: 4 }} /></div>
                  : <Send size={16} />
                }
              </button>
            </div>
          </>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <NewChatModal
          users={allUsers}
          onDirect={startDirect}
          onGroup={createGroup}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
}
