import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, User, Plus, Search, Reply, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { mockUsers } from '@/data/mockData';

interface Message {
  id: string;
  from: string;
  fromRole: string;
  to: string;
  toRole: string;
  subject: string;
  content: string;
  date: string;
  unread: boolean;
  replies?: Message[];
}

const mockMessages: Message[] = [
  {
    id: 'm1',
    from: 'Dr. Emily Williams',
    fromRole: 'Academic Supervisor',
    to: 'Mr. James Anderson',
    toRole: 'Industrial Supervisor',
    subject: 'Student Progress Review - John Smith',
    content: 'I would like to discuss the progress of John Smith. His monthly report indicates good progress but I noticed some areas where he might need additional support.',
    date: '2024-01-15',
    unread: true,
  },
  {
    id: 'm2',
    from: 'Ms. Lisa Brown',
    fromRole: 'Company Focal Person',
    to: 'Prof. Michael Chen',
    toRole: 'University Focal Person',
    subject: 'New SIT Opportunity Posted',
    content: 'We have posted a new SIT opportunity for Software Engineering interns. Please review and share with eligible students.',
    date: '2024-01-14',
    unread: false,
  },
  {
    id: 'm3',
    from: 'Mr. James Anderson',
    fromRole: 'Industrial Supervisor',
    to: 'Ms. Lisa Brown',
    toRole: 'Company Focal Person',
    subject: 'Intern Evaluation Completed',
    content: 'I have completed the monthly evaluation for the SIT students assigned to our department. Please find the details in the evaluation portal.',
    date: '2024-01-12',
    unread: false,
  },
  {
    id: 'm4',
    from: 'Prof. Michael Chen',
    fromRole: 'University Focal Person',
    to: 'Dr. Emily Williams',
    toRole: 'Academic Supervisor',
    subject: 'Company Assignment Update',
    content: 'You have been assigned to supervise students at TechCorp Inc. and DataFlow Systems for this SIT cycle.',
    date: '2024-01-10',
    unread: false,
  },
];

const roleRecipients = {
  university_focal: ['Academic Supervisor', 'Company Focal Person', 'Industrial Supervisor'],
  academic_supervisor: ['University Focal Person', 'Industrial Supervisor', 'Company Focal Person'],
  industrial_supervisor: ['Academic Supervisor', 'Company Focal Person', 'University Focal Person'],
  company_focal: ['University Focal Person', 'Academic Supervisor', 'Industrial Supervisor'],
};

export function CommunicationHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    recipient: '',
    subject: '',
    content: '',
  });

  const recipients = roleRecipients[user?.role as keyof typeof roleRecipients] || [];

  const getRecipientsForRole = (role: string) => {
    return mockUsers.filter(u => {
      const roleMap: Record<string, string> = {
        'Academic Supervisor': 'academic_supervisor',
        'Industrial Supervisor': 'industrial_supervisor',
        'Company Focal Person': 'company_focal',
        'University Focal Person': 'university_focal',
      };
      return u.role === roleMap[role];
    });
  };

  const filteredMessages = mockMessages.filter(msg =>
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!newMessage.recipient || !newMessage.subject || !newMessage.content) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields before sending.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Message Sent',
      description: `Your message has been sent to ${newMessage.recipient}.`,
    });
    setIsComposeOpen(false);
    setNewMessage({ recipient: '', subject: '', content: '' });
  };

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsViewOpen(true);
  };

  const handleReply = () => {
    if (selectedMessage) {
      setNewMessage({
        recipient: selectedMessage.fromRole,
        subject: `Re: ${selectedMessage.subject}`,
        content: '',
      });
      setIsViewOpen(false);
      setIsComposeOpen(true);
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsComposeOpen(true)} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Compose Message
          </Button>
        </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages found</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                  <div
                  key={message.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                    message.unread ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                  onClick={() => handleViewMessage(message)}
                >
                  <div className="flex items-start justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-medium truncate">{message.from}</span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">{message.fromRole}</Badge>
                          {message.unread && <Badge variant="default" className="text-xs flex-shrink-0">New</Badge>}
                        </div>
                        <p className="font-medium text-sm mt-1 truncate">{message.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 break-words">{message.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {message.date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Role</Label>
              <Select
                value={newMessage.recipient}
                onValueChange={(value) => setNewMessage({ ...newMessage, recipient: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient role" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Enter message subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message here..."
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                className="min-h-[150px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsComposeOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSendMessage} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6 break-words">{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{selectedMessage.from}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs flex-shrink-0">{selectedMessage.fromRole}</Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{selectedMessage.date}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg max-h-60 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap break-words">{selectedMessage.content}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
            <Button onClick={handleReply} className="w-full sm:w-auto">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
