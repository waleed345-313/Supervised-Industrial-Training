import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, User as UserIcon, Plus, Search, Clock, Paperclip, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { io, type Socket } from 'socket.io-client';
import type { User, Company } from '@/types';

interface ActorUser extends Pick<User, 'id' | 'name' | 'email' | 'role' | 'avatar' | 'department' | 'companyId'> {}

type ActorRole = 'university_focal' | 'academic_supervisor' | 'industrial_supervisor' | 'company_focal';

const ACTOR_ROLES: ActorRole[] = ['university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal'];

interface Attachment {
  id?: string;
  name: string;
  url?: string;
  data?: string; // base64 encoded file data
  type: string;
  size: number;
}

interface MessagePayload {
  id: string;
  from: string;
  fromRole: string;
  to: string;
  toRole: string;
  subject: string;
  content: string;
  date: string; // YYYY-MM-DD
  unread: boolean;
  read: boolean;
  fromUserId: string;
  toUserId: string;
  replyTo?: string;
  attachments?: Attachment[];
}

interface ThreadPayload {
  otherUser: ActorUser | null;
  lastMessage: MessagePayload;
  unreadCount: number;
}

interface GroupConversationPayload {
  id: string;
  name: string;
  participants: ActorUser[];
  lastMessage: (MessagePayload & { conversationId?: string }) | null;
  unreadCount: number;
  updatedAt: string;
}

interface GroupMessagePayload {
  id: string;
  conversationId: string;
  from: string;
  fromRole: string;
  subject: string;
  content: string;
  date: string;
  unread: boolean;
  read: boolean;
  fromUserId: string;
  attachments?: Attachment[];
}

export function CommunicationHub() {
  const { user } = useAuth();
  const { toast } = useToast();

  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000';
  const token = localStorage.getItem('sit_portal_token');

  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [actorUsers, setActorUsers] = useState<ActorUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [threads, setThreads] = useState<ThreadPayload[]>([]);
  const [groups, setGroups] = useState<GroupConversationPayload[]>([]);

  const [activeMode, setActiveMode] = useState<'direct' | 'group'>('direct');

  const [selectedWithUserId, setSelectedWithUserId] = useState<string | null>(null);
  const selectedWithUserIdRef = useRef<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessagePayload[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroupIdRef = useRef<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessagePayload[]>([]);


  const [compose, setCompose] = useState({
    mode: 'direct' as 'direct' | 'group',
    toUserId: '',
    subject: '',
    content: '',
  });
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [createGroup, setCreateGroup] = useState({
    name: '',
    participantIds: [] as string[],
  });

  const [reply, setReply] = useState({
    subject: '',
    content: '',
  });
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const composeImageInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const replyImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    selectedWithUserIdRef.current = selectedWithUserId;
  }, [selectedWithUserId]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  const refreshThreads = useCallback(async () => {
    if (!user?.id) return;
    if (!token) return;
    try {
      const data: ThreadPayload[] = await api.getMessageThreads();
      setThreads(data);
    } catch (err: any) {
      toast({
        title: 'Failed to load messages',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast, token, user?.id]);

  const refreshGroups = useCallback(async () => {
    if (!user?.id) return;
    if (!token) return;
    try {
      const data: GroupConversationPayload[] = await api.getGroupConversations();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        title: 'Failed to load group chats',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast, token, user?.id]);

  const refreshThread = useCallback(
    async (withUserId: string, markRead: boolean) => {
      if (!user?.id) return [];
      if (!token) return [];
      const data: MessagePayload[] = await api.getThreadMessages(withUserId, markRead);
      setThreadMessages(data);
      return data;
    },
    [token, user?.id]
  );

  const refreshGroupThread = useCallback(
    async (groupId: string, markRead: boolean) => {
      if (!user?.id) return [];
      if (!token) return [];
      const data: GroupMessagePayload[] = await api.getGroupMessages(groupId, markRead);
      setGroupMessages(Array.isArray(data) ? data : []);
      return data;
    },
    [token, user?.id]
  );

  const refreshActorUsers = useCallback(async () => {
    try {
      const data = (await api.getUsers()) as ActorUser[];
      const filtered = data.filter((u) => ACTOR_ROLES.includes(u.role as ActorRole));
      setActorUsers(filtered);
    } catch (err: any) {
      // Users endpoint is not auth-gated; show a warning only.
      toast({
        title: 'User list unavailable',
        description: err?.message || 'Please try again later.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const refreshCompanies = useCallback(async () => {
    try {
      const data = (await api.getCompanies()) as Company[];
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load companies for communication:', err);
      setCompanies([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;
    refreshActorUsers();
    refreshCompanies();
    refreshThreads();
    refreshGroups();
  }, [refreshActorUsers, refreshCompanies, refreshThreads, user]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;
    if (!token) return;
    const socket = io(apiBase, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('message:new', async () => {
      // Keep UI consistent and "real time" by refetching.
      await refreshThreads();

      if (selectedWithUserIdRef.current) {
        await refreshThread(selectedWithUserIdRef.current, true);
      }
    });

    socket.on('message:group:new', async (payload: { conversationId?: string }) => {
      await refreshGroups();
      const openId = selectedGroupIdRef.current;
      if (openId && payload?.conversationId && String(payload.conversationId) === String(openId)) {
        await refreshGroupThread(openId, true);
      }
    });

    socket.on('connect_error', (err) => {
      // Do not spam toasts; network flakiness is common.
      console.warn('Socket connect_error:', err?.message || err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBase, refreshGroupThread, refreshGroups, refreshThread, refreshThreads, token, user?.id]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const m = t.lastMessage;
      return (
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, threads]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const last = g.lastMessage;
      return (
        g.name.toLowerCase().includes(q) ||
        (last?.subject || '').toLowerCase().includes(q) ||
        (last?.content || '').toLowerCase().includes(q)
      );
    });
  }, [groups, searchQuery]);

  const canUseHub = Boolean(token && user?.role && ACTOR_ROLES.includes(user.role as ActorRole));

  const selectedActorUser = useMemo(() => {
    if (!selectedWithUserId) return null;
    return actorUsers.find((u) => String(u.id) === String(selectedWithUserId)) || null;
  }, [actorUsers, selectedWithUserId]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => String(g.id) === String(selectedGroupId)) || null;
  }, [groups, selectedGroupId]);

  const selectedThreadPreview = useMemo(() => {
    if (!selectedWithUserId) return null;
    return (
      threads.find((t) => {
        const otherId =
          t.otherUser?.id ||
          (t.lastMessage.fromUserId === String(user?.id) ? t.lastMessage.toUserId : t.lastMessage.fromUserId);
        return String(otherId) === String(selectedWithUserId);
      }) || null
    );
  }, [selectedWithUserId, threads, user?.id]);

  const openThread = useCallback(
    async (otherUserId: string) => {
      setActiveMode('direct');
      setSelectedGroupId(null);
      setGroupMessages([]);
      setSelectedWithUserId(otherUserId);
      setThreadMessages([]);
      setReply({ subject: 'Re:', content: '' });

      try {
        const data = await refreshThread(otherUserId, true);
        const last = data.length ? data[data.length - 1] : null;
        setReply({ subject: last ? `Re: ${last.subject}` : 'Re:', content: '' });
        
        // Mark messages as read and update thread list state
        if (data.some((m: MessagePayload) => m.unread)) {
          try {
            await api.markMessagesAsRead({ withUserId: otherUserId });
            // Update thread list to reflect read status
            setThreads((prev) =>
              prev.map((t) =>
                String(t.otherUser?.id) === String(otherUserId)
                  ? { ...t, unreadCount: 0 }
                  : t
              )
            );
            // Update thread messages to reflect read status
            setThreadMessages((prev) =>
              prev.map((m) => ({ ...m, unread: false, read: true }))
            );
          } catch {
            // Silently fail on mark as read errors
          }
        }
      } catch {
        // refreshThread already toasts errors from threads load; keep silent here.
      }
    },
    [refreshThread]
  );

  const openGroup = useCallback(
    async (groupId: string) => {
      setActiveMode('group');
      setSelectedWithUserId(null);
      setThreadMessages([]);
      setSelectedGroupId(groupId);
      setGroupMessages([]);
      setReply({ subject: '', content: '' });
      setReplyAttachments([]);
      try {
        const data = await refreshGroupThread(groupId, true);
        // Mark group messages as read and update state
        if (data.some((m: GroupMessagePayload) => m.unread)) {
          try {
            await api.markMessagesAsRead({ groupId });
            // Update group list to reflect read status
            setGroups((prev) =>
              prev.map((g) =>
                String(g.id) === String(groupId) ? { ...g, unreadCount: 0 } : g
              )
            );
            // Update group messages to reflect read status
            setGroupMessages((prev) =>
              prev.map((m) => ({ ...m, unread: false, read: true }))
            );
          } catch {
            // Silently fail on mark as read errors
          }
        }
      } catch {
        /* ignore */
      }
    },
    [refreshGroupThread]
  );

  // File handling functions
  const handleComposeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setComposeAttachments((prev) => [...prev, ...files]);
    }
    // Reset input to allow selecting same file again
    if (composeFileInputRef.current) {
      composeFileInputRef.current.value = '';
    }
  };

  const handleComposeImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setComposeAttachments((prev) => [...prev, ...files]);
    }
    if (composeImageInputRef.current) {
      composeImageInputRef.current.value = '';
    }
  };

  const handleReplyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setReplyAttachments((prev) => [...prev, ...files]);
    }
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = '';
    }
  };

  const handleReplyImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setReplyAttachments((prev) => [...prev, ...files]);
    }
    if (replyImageInputRef.current) {
      replyImageInputRef.current.value = '';
    }
  };

  const removeComposeAttachment = (index: number) => {
    setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeReplyAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatRole = (role?: string): string => (role || '').replace(/_/g, ' ');

  const formatSenderLabel = (params: { name?: string; role?: string; userId?: string }): string => {
    const safeName = (params.name || '').trim() || 'Unknown user';
    const role = params.role;
    const senderUser = params.userId ? actorUsers.find((u) => String(u.id) === String(params.userId)) : null;
    const companyName = senderUser?.companyId
      ? companies.find((company) => String(company.id) === String(senderUser.companyId))?.name
      : null;

    if (role === 'industrial_supervisor' || role === 'company_focal') {
      return companyName ? `${safeName} (${companyName})` : `${safeName} (${formatRole(role)})`;
    }

    if (role === 'academic_supervisor' || role === 'university_focal') {
      return `${safeName} (${formatRole(role)})`;
    }

    return safeName;
  };

  const formatMemberLabel = (member: ActorUser): string => {
    const safeName = member.name?.trim() || 'Unknown user';
    if (member.role === 'industrial_supervisor' || member.role === 'company_focal') {
      const companyName = member.companyId
        ? companies.find((company) => String(company.id) === String(member.companyId))?.name
        : null;
      return companyName ? `${safeName} (${companyName})` : safeName;
    }

    if (member.role === 'academic_supervisor' || member.role === 'university_focal') {
      return `${safeName} (${formatRole(member.role)})`;
    }

    return safeName;
  };

  // Convert file to base64 for JSON transmission
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // File size limits (in bytes) - 1MB per file, 5MB total
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
  const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total

  const validateFileSize = (files: File[]): { valid: boolean; message?: string } => {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    if (totalSize > MAX_TOTAL_SIZE) {
      return { 
        valid: false, 
        message: `Total attachment size (${formatFileSize(totalSize)}) exceeds limit (${formatFileSize(MAX_TOTAL_SIZE)}). Please attach smaller files or fewer files.` 
      };
    }
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return { 
          valid: false, 
          message: `File "${file.name}" (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(MAX_FILE_SIZE)}). Please choose a smaller file.` 
        };
      }
    }
    
    return { valid: true };
  };

  const handleSendCompose = useCallback(async () => {
    if (!user?.id) return;
    if (!token) return;

    // Debug logging
    console.log('Sending message:', {
      mode: compose.mode,
      toUserId: compose.toUserId,
      subject: compose.subject,
      contentLength: compose.content.length,
      attachments: composeAttachments.length,
    });

    if (compose.mode === 'direct') {
      const trimmedSubject = compose.subject.trim();
      const trimmedContent = compose.content.trim();
      const toUserId = compose.toUserId?.trim();
      
      if (!toUserId || !trimmedSubject || !trimmedContent) {
        toast({
          title: 'Missing Information',
          description: `Please fill in all required fields. Recipient: ${toUserId || 'empty'}, Subject: ${trimmedSubject || 'empty'}, Content: ${trimmedContent ? 'has content' : 'empty'}`,
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!compose.content.trim()) {
        toast({
          title: 'Missing message content',
          description: 'Please type a message.',
          variant: 'destructive',
        });
        return;
      }
      if (!createGroup.name.trim() || createGroup.participantIds.length === 0) {
        toast({
          title: 'Missing group details',
          description: 'Please provide a group name and select at least one participant (CC).',
          variant: 'destructive',
        });
        return;
      }
    }

    // Use the trimmed values we validated
    const toUserId = compose.toUserId?.trim();
    const subject = compose.subject.trim();
    const content = compose.content.trim();

    // Validate file sizes before sending
    if (composeAttachments.length > 0) {
      const validation = validateFileSize(composeAttachments);
      if (!validation.valid) {
        toast({
          title: 'Attachments too large',
          description: validation.message,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      if (compose.mode === 'direct') {
        // Convert attachments to base64 and include in JSON
        let attachments: any[] = [];
        if (composeAttachments.length > 0) {
          try {
            attachments = await Promise.all(
              composeAttachments.map(async (file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
                data: await fileToBase64(file),
              }))
            );
          } catch (err) {
            console.warn('Failed to convert attachments to base64:', err);
          }
        }
        
        console.log('Sending JSON with attachments:', { toUserId, subject, attachmentsCount: attachments.length });
        await api.sendMessage({
          toUserId,
          subject,
          content,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setIsComposeOpen(false);
        setCompose({ mode: 'direct', toUserId: '', subject: '', content: '' });
        setComposeAttachments([]);
        await refreshThreads();
        return;
      }

      const conv = await api.createGroupConversation({
        name: createGroup.name.trim(),
        participantIds: createGroup.participantIds,
      });

      // Convert attachments to base64 and include in JSON
      let attachments: any[] = [];
      if (composeAttachments.length > 0) {
        try {
          attachments = await Promise.all(
            composeAttachments.map(async (file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              data: await fileToBase64(file),
            }))
          );
        } catch (err) {
          console.warn('Failed to convert attachments to base64:', err);
        }
      }
      
      await api.sendGroupMessage(String(conv.id), {
        subject: compose.subject.trim(),
        content: compose.content.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setIsComposeOpen(false);
      setCompose({ mode: 'direct', toUserId: '', subject: '', content: '' });
      setComposeAttachments([]);
      setCreateGroup({ name: '', participantIds: [] });
      await refreshGroups();
      await openGroup(String(conv.id));
    } catch (err: any) {
      console.error('Send message error:', err);
      toast({
        title: compose.mode === 'direct' ? 'Failed to send message' : 'Failed to create/send group message',
        description: err?.message || err?.msg || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [
    compose.content,
    compose.mode,
    compose.subject,
    compose.toUserId,
    composeAttachments,
    createGroup.name,
    createGroup.participantIds,
    openGroup,
    refreshGroups,
    refreshThreads,
    toast,
    token,
    user?.id,
  ]);

  const handleSendReply = useCallback(async () => {
    if (!user?.id) return;
    if (!token) return;
    if (activeMode === 'direct' && !selectedWithUserId) return;
    if (activeMode === 'group' && !selectedGroupId) return;

    if (!reply.content.trim()) {
      toast({
        title: 'Missing reply content',
        description: 'Please type a message to reply.',
        variant: 'destructive',
      });
      return;
    }

    // Validate reply attachments before sending
    if (replyAttachments.length > 0) {
      const validation = validateFileSize(replyAttachments);
      if (!validation.valid) {
        toast({
          title: 'Attachments too large',
          description: validation.message,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      if (activeMode === 'direct') {
        const subject =
          reply.subject.trim() ||
          (threadMessages[threadMessages.length - 1]?.subject
            ? `Re: ${threadMessages[threadMessages.length - 1].subject}`
            : 'Re:');
        const lastId = threadMessages.length ? threadMessages[threadMessages.length - 1].id : undefined;
        
        // Convert attachments to base64 and include in JSON
        let attachments: any[] = [];
        if (replyAttachments.length > 0) {
          try {
            attachments = await Promise.all(
              replyAttachments.map(async (file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
                data: await fileToBase64(file),
              }))
            );
          } catch (err) {
            console.warn('Failed to convert attachments to base64:', err);
          }
        }
        
        await api.sendMessage({
          toUserId: selectedWithUserId as string,
          subject,
          content: reply.content.trim(),
          replyTo: lastId,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setReply((r) => ({ ...r, content: '' }));
        setReplyAttachments([]);
        await refreshThread(selectedWithUserId as string, true);
        return;
      }

      // Group reply with attachments
      let attachments: any[] = [];
      if (replyAttachments.length > 0) {
        try {
          attachments = await Promise.all(
            replyAttachments.map(async (file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              data: await fileToBase64(file),
            }))
          );
        } catch (err) {
          console.warn('Failed to convert attachments to base64:', err);
        }
      }
      
      await api.sendGroupMessage(selectedGroupId as string, {
        subject: reply.subject.trim(),
        content: reply.content.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setReply((r) => ({ ...r, content: '' }));
      setReplyAttachments([]);
      await refreshGroupThread(selectedGroupId as string, true);
    } catch (err: any) {
      toast({
        title: 'Failed to send reply',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [
    activeMode,
    reply.content,
    reply.subject,
    replyAttachments,
    refreshGroupThread,
    refreshThread,
    selectedGroupId,
    selectedWithUserId,
    threadMessages,
    toast,
    token,
    user?.id,
  ]);

  const recipientsForCompose = useMemo(() => {
    if (!user?.id) return [];
    
    // Base filter: exclude self and ensure user has one of the actor roles
    let filtered = actorUsers.filter((u) => 
      String(u.id) !== String(user.id) && ACTOR_ROLES.includes(u.role as ActorRole)
    );
    
    // Get company IDs where the academic supervisor is assigned (has supervisorId matching academic supervisor)
    const assignedCompanyIds = new Set(
      companies
        .filter((c) => c.supervisorId && String(c.supervisorId) === String(user.id))
        .map((c) => c.id)
    );
    
    // Get the academic supervisor ID for the current user's company
    const userCompany = user.companyId ? companies.find((c) => String(c.id) === String(user.companyId)) : null;
    const assignedAcademicSupervisorId = userCompany?.supervisorId;
    
    // Apply role-based restrictions
    if (user.role === 'company_focal') {
      // Company Focal can only message:
      // - Industrial supervisors in their company
      // - Academic supervisor assigned to their company (via supervisorId)
      // - University focal person
      filtered = filtered.filter((u) => {
        if (u.role === 'industrial_supervisor' && u.companyId === user.companyId) return true;
        if (u.role === 'academic_supervisor' && assignedAcademicSupervisorId && String(u.id) === String(assignedAcademicSupervisorId)) return true;
        if (u.role === 'university_focal') return true;
        return false;
      });
    } else if (user.role === 'industrial_supervisor') {
      // Industrial Supervisor can only message:
      // - Company focal of their company
      // - Academic supervisor assigned to their company (via supervisorId)
      // - Other industrial supervisors in the same company
      filtered = filtered.filter((u) => {
        if (u.role === 'company_focal' && u.companyId === user.companyId) return true;
        if (u.role === 'industrial_supervisor' && u.companyId === user.companyId) return true;
        if (u.role === 'academic_supervisor' && assignedAcademicSupervisorId && String(u.id) === String(assignedAcademicSupervisorId)) return true;
        if (u.role === 'university_focal') return true;
        return false;
      });
    } else if (user.role === 'academic_supervisor') {
      // Academic Supervisor can only message:
      // - Company focal persons of companies assigned to them (supervisorId matches their id)
      // - Industrial supervisors in those assigned companies
      // - University focal person
      filtered = filtered.filter((u) => {
        if (u.role === 'university_focal') return true;
        // Only company focals whose companies have this academic supervisor assigned
        if (u.role === 'company_focal' && u.companyId && assignedCompanyIds.has(u.companyId)) return true;
        // Only industrial supervisors in companies where this academic supervisor is assigned
        if (u.role === 'industrial_supervisor' && u.companyId && assignedCompanyIds.has(u.companyId)) return true;
        return false;
      });
    }
    // university_focal can message all actors (no additional filter)
    
    return filtered;
  }, [actorUsers, companies, user?.id, user?.role, user?.companyId]);

  if (!user) return null;
  if (!canUseHub) {
    return (
      <div className="text-sm text-muted-foreground">
        Real-time communication is available for registered users. Please sign in to use the messaging hub.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="rounded-[1.75rem] border bg-slate-100/70 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-slate-300 bg-white pl-10"
            />
          </div>
          <Button onClick={() => setIsComposeOpen(true)} className="h-11 whitespace-nowrap rounded-xl px-5">
            <Plus className="h-4 w-4 mr-2" />
            New Message / Group
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">Communication</h2>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeMode === 'direct' ? 'default' : 'outline'}
                className="rounded-lg"
                onClick={() => setActiveMode('direct')}
              >
                Direct
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeMode === 'group' ? 'default' : 'outline'}
                className="rounded-lg"
                onClick={() => setActiveMode('group')}
              >
                Groups (CC)
              </Button>
            </div>

            <div className="mt-4 max-h-[560px] space-y-1 overflow-y-auto pr-1">
              {activeMode === 'direct' && filteredThreads.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No conversations found</p>
                </div>
              ) : activeMode === 'direct' ? (
                filteredThreads.map((t) => {
                  const otherId =
                    t.otherUser?.id ||
                    (t.lastMessage.fromUserId === String(user.id) ? t.lastMessage.toUserId : t.lastMessage.fromUserId);

                  if (!otherId) return null;

                  const isSelected = String(selectedWithUserId) === String(otherId);
                  return (
                    <button
                      key={otherId}
                      type="button"
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => openThread(String(otherId))}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{t.otherUser?.name || t.lastMessage.from}</p>
                              {t.unreadCount > 0 ? (
                                <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" />
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{t.lastMessage.content}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{t.lastMessage.date}</span>
                      </div>
                    </button>
                  );
                })
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No group chats yet</p>
                </div>
              ) : (
                filteredGroups.map((g) => {
                  const isSelected = String(selectedGroupId) === String(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => openGroup(String(g.id))}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{g.name}</p>
                              {g.unreadCount > 0 ? (
                                <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" />
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {g.lastMessage?.content || `${g.participants?.length || 0} members`}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {g.lastMessage?.date || new Date(g.updatedAt).toISOString().slice(0, 10)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 min-h-[560px]">
            {activeMode === 'direct' && selectedWithUserId ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold truncate">
                      {selectedThreadPreview?.otherUser?.name || selectedActorUser?.name || 'Conversation'}
                    </p>
                    {(selectedThreadPreview?.otherUser?.role || selectedActorUser?.role) ? (
                      <p className="text-sm text-muted-foreground">
                        {(selectedThreadPreview?.otherUser?.role || selectedActorUser?.role || '').replace(/_/g, ' ')}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedWithUserId(null);
                      setThreadMessages([]);
                      setReplyAttachments([]);
                    }}
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 p-4 border rounded-lg max-h-80 overflow-y-auto space-y-3 bg-slate-50/60">
                  {threadMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">No messages yet.</div>
                  ) : (
                    threadMessages.map((m) => {
                      const mine = m.fromUserId === String(user.id);
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] p-3 rounded-lg border ${
                              mine ? 'bg-primary/5 border-primary/20' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {formatSenderLabel({ name: m.from, role: m.fromRole, userId: m.fromUserId })}
                              </Badge>
                              {!mine && m.unread ? (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              ) : null}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{m.date}</span>
                            </div>
                            <p className="font-medium mt-1 break-words">{m.subject}</p>
                            <p className="text-sm whitespace-pre-wrap break-words mt-1">{m.content}</p>
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {m.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.data || att.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={att.name}
                                    className="flex items-center gap-2 bg-muted/70 rounded-md px-2 py-1 text-sm hover:bg-muted"
                                  >
                                    {(att.type || '').startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                    <span className="text-muted-foreground text-xs">({formatFileSize(att.size || 0)})</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reply-subject">Subject</Label>
                      <Input id="reply-subject" value={reply.subject} onChange={(e) => setReply((prev) => ({ ...prev, subject: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reply-date" className="opacity-0 select-none">
                        Date
                      </Label>
                      <div className="h-[38px]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reply-content">Reply</Label>
                    <div className="relative">
                      <input
                        type="file"
                        ref={replyFileInputRef}
                        onChange={handleReplyFileSelect}
                        className="hidden"
                        multiple
                      />
                      <input
                        type="file"
                        ref={replyImageInputRef}
                        accept="image/*"
                        onChange={handleReplyImageSelect}
                        className="hidden"
                        multiple
                      />
                      <Textarea
                        id="reply-content"
                        placeholder="Write your reply here..."
                        value={reply.content}
                        onChange={(e) => setReply((prev) => ({ ...prev, content: e.target.value }))}
                        className="min-h-[120px] resize-none pb-12"
                      />
                      <div className="absolute bottom-2 left-2 flex gap-2">
                        <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Attach file" onClick={() => replyFileInputRef.current?.click()}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Attach image" onClick={() => replyImageInputRef.current?.click()}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {replyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {replyAttachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1 text-sm">
                            {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                            <button
                              type="button"
                              onClick={() => removeReplyAttachment(idx)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleSendReply}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            ) : activeMode === 'group' && selectedGroup ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold truncate">{selectedGroup.name}</p>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                      onClick={() => setIsGroupMembersOpen(true)}
                    >
                      {selectedGroup.participants?.length || 0} members
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedGroupId(null);
                      setGroupMessages([]);
                      setReplyAttachments([]);
                    }}
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 p-4 border rounded-lg max-h-80 overflow-y-auto space-y-3 bg-slate-50/60">
                  {groupMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">No group messages yet.</div>
                  ) : (
                    groupMessages.map((m) => {
                      const mine = m.fromUserId === String(user.id);
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] p-3 rounded-lg border ${
                              mine ? 'bg-primary/5 border-primary/20' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {formatSenderLabel({ name: m.from, role: m.fromRole, userId: m.fromUserId })}
                              </Badge>
                              {!mine && m.unread ? (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              ) : null}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{m.date}</span>
                            </div>
                            {m.subject ? <p className="font-medium mt-1 break-words">{m.subject}</p> : null}
                            <p className="text-sm whitespace-pre-wrap break-words mt-1">{m.content}</p>
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {m.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.data || att.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={att.name}
                                    className="flex items-center gap-2 bg-muted/70 rounded-md px-2 py-1 text-sm hover:bg-muted"
                                  >
                                    {(att.type || '').startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                    <span className="text-muted-foreground text-xs">({formatFileSize(att.size || 0)})</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reply-subject-group">Subject</Label>
                    <Input id="reply-subject-group" value={reply.subject} onChange={(e) => setReply((prev) => ({ ...prev, subject: e.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reply-content-group">Reply</Label>
                    <div className="relative">
                      <input
                        type="file"
                        ref={replyFileInputRef}
                        onChange={handleReplyFileSelect}
                        className="hidden"
                        multiple
                      />
                      <input
                        type="file"
                        ref={replyImageInputRef}
                        accept="image/*"
                        onChange={handleReplyImageSelect}
                        className="hidden"
                        multiple
                      />
                      <Textarea
                        id="reply-content-group"
                        placeholder="Write your reply here..."
                        value={reply.content}
                        onChange={(e) => setReply((prev) => ({ ...prev, content: e.target.value }))}
                        className="min-h-[120px] resize-none pb-12"
                      />
                      <div className="absolute bottom-2 left-2 flex gap-2">
                        <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Attach file" onClick={() => replyFileInputRef.current?.click()}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Attach image" onClick={() => replyImageInputRef.current?.click()}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {replyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {replyAttachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1 text-sm">
                            {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                            <button
                              type="button"
                              onClick={() => removeReplyAttachment(idx)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleSendReply}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-foreground">No conversation selected</h3>
                <p className="mt-2 max-w-sm text-sm">
                  Select a conversation from the left panel to open it here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={isGroupMembersOpen} onOpenChange={setIsGroupMembersOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name || 'Group members'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(selectedGroup?.participants || []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No members available.</div>
            ) : (
              selectedGroup!.participants.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{formatMemberLabel(member)}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {formatRole(member.role)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Message / Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={compose.mode}
                onValueChange={(value) => {
                  const v = value as 'direct' | 'group';
                  setCompose((prev) => ({ ...prev, mode: v }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct message</SelectItem>
                  <SelectItem value="group">Group (CC / WhatsApp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {compose.mode === 'direct' ? (
            <div className="space-y-2">
              <Label>Recipient <span className="text-destructive">*</span></Label>
              <Select value={compose.toUserId} onValueChange={(value) => {
                console.log('Selected recipient:', value);
                setCompose((prev) => ({ ...prev, toUserId: value }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={recipientsForCompose.length === 0 ? "No recipients available" : "Select recipient"} />
                </SelectTrigger>
                <SelectContent>
                  {recipientsForCompose.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No available recipients
                    </div>
                  ) : (
                    recipientsForCompose.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.role.replace(/_/g, ' ')})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Group name</Label>
                  <Input
                    placeholder="e.g. SIT Coordination (CC)"
                    value={createGroup.name}
                    onChange={(e) => setCreateGroup((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Participants (CC)</Label>
                  <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
                    {recipientsForCompose.map((u) => {
                      const checked = createGroup.participantIds.includes(String(u.id));
                      return (
                        <label key={u.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const id = String(u.id);
                              setCreateGroup((prev) => ({
                                ...prev,
                                participantIds: e.target.checked
                                  ? Array.from(new Set([...prev.participantIds, id]))
                                  : prev.participantIds.filter((x) => x !== id),
                              }));
                            }}
                          />
                          <span className="truncate">
                            {u.name} ({u.role.replace(/_/g, ' ')})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">You will be included automatically.</p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input placeholder="Enter message subject" value={compose.subject} onChange={(e) => setCompose((prev) => ({ ...prev, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <div className="relative">
                <Textarea placeholder="Type your message here..." value={compose.content} onChange={(e) => setCompose((prev) => ({ ...prev, content: e.target.value }))} className="min-h-[150px] resize-none pb-12" />
                <div className="absolute bottom-2 left-2 flex gap-2">
                  <input
                    type="file"
                    ref={composeFileInputRef}
                    onChange={handleComposeFileSelect}
                    className="hidden"
                    multiple
                  />
                  <input
                    type="file"
                    ref={composeImageInputRef}
                    accept="image/*"
                    onChange={handleComposeImageSelect}
                    className="hidden"
                    multiple
                  />
                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Attach file" onClick={() => composeFileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Attach image" onClick={() => composeImageInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Attached files display */}
              {composeAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {composeAttachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1 text-sm">
                      {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        onClick={() => removeComposeAttachment(idx)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setIsComposeOpen(false); setComposeAttachments([]); }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSendCompose} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

