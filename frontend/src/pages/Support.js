import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiUrl from '../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  Send,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Inbox,
  MessageCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  open: { label: 'Açık', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Inbox },
  in_progress: { label: 'İşlemde', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  waiting_customer: { label: 'Yanıtınız Bekleniyor', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: MessageCircle },
  resolved: { label: 'Çözüldü', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  closed: { label: 'Kapandı', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle }
};

const PRIORITY_CONFIG = {
  low: { label: 'Düşük', color: 'bg-slate-500/20 text-slate-400' },
  medium: { label: 'Orta', color: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'Yüksek', color: 'bg-orange-500/20 text-orange-400' },
  urgent: { label: 'Acil', color: 'bg-red-500/20 text-red-400' }
};

const CATEGORY_OPTIONS = [
  { value: 'technical', label: 'Teknik Destek' },
  { value: 'billing', label: 'Fatura / Ödeme' },
  { value: 'feature_request', label: 'Özellik Talebi' },
  { value: 'bug_report', label: 'Hata Bildirimi' },
  { value: 'account', label: 'Hesap' },
  { value: 'general', label: 'Genel' }
];

export const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/support/tickets`);
      setTickets(response.data || []);
    } catch (error) {
      toast.error('Destek talepleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error('Konu ve mesaj zorunludur');
      return;
    }

    try {
      const response = await axios.post(`${getApiUrl()}/api/support/tickets`, newTicket);
      toast.success(`Destek talebi oluşturuldu: ${response.data.ticket_number}`);
      setIsNewTicketOpen(false);
      setNewTicket({ subject: '', message: '', category: 'general', priority: 'medium' });
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Talep oluşturulamadı');
    }
  };

  const handleViewTicket = async (ticket) => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/support/tickets/${ticket.id}`);
      setSelectedTicket(response.data);
      setIsDetailOpen(true);
    } catch (error) {
      toast.error('Detay yüklenemedi');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      await axios.post(`${getApiUrl()}/api/support/tickets/${selectedTicket.id}/reply`, {
        message: replyText
      });
      toast.success('Yanıt gönderildi');
      setReplyText('');
      // Refresh ticket
      const response = await axios.get(`${getApiUrl()}/api/support/tickets/${selectedTicket.id}`);
      setSelectedTicket(response.data);
      fetchTickets();
    } catch (error) {
      toast.error('Yanıt gönderilemedi');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('tr-TR');
  };

  const getTimeSince = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 60) return `${diff} dk önce`;
    if (diff < 1440) return `${Math.floor(diff / 60)} saat önce`;
    return `${Math.floor(diff / 1440)} gün önce`;
  };

  // Count tickets by status
  const openCount = tickets.filter(t => ['open', 'in_progress', 'waiting_customer'].includes(t.status)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Destek</h1>
          <p className="text-slate-400">Teknik destek ve yardım talepleri</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTickets} variant="outline" className="border-slate-600 text-slate-300">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsNewTicketOpen(true)} className="bg-accent hover:bg-accent/80">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Talep
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Inbox className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tickets.length}</p>
              <p className="text-slate-400 text-sm">Toplam Talep</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{openCount}</p>
              <p className="text-slate-400 text-sm">Açık Talep</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tickets.filter(t => t.status === 'resolved').length}</p>
              <p className="text-slate-400 text-sm">Çözülen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Destek Taleplerim</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">Henüz destek talebiniz yok</p>
              <Button onClick={() => setIsNewTicketOpen(true)} className="bg-accent hover:bg-accent/80">
                <Plus className="h-4 w-4 mr-2" />
                İlk Talebinizi Oluşturun
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleViewTicket(ticket)}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <StatusIcon className={`h-5 w-5 mt-1 ${statusConfig.color.includes('blue') ? 'text-blue-500' : statusConfig.color.includes('yellow') ? 'text-yellow-500' : statusConfig.color.includes('green') ? 'text-green-500' : statusConfig.color.includes('purple') ? 'text-purple-500' : 'text-slate-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-purple-400">{ticket.ticket_number}</span>
                          <Badge variant="outline" className={statusConfig.color}>{statusConfig.label}</Badge>
                        </div>
                        <p className="text-white font-medium mt-1">{ticket.subject}</p>
                        <p className="text-slate-500 text-sm">{getTimeSince(ticket.updated_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={PRIORITY_CONFIG[ticket.priority]?.color}>
                        {PRIORITY_CONFIG[ticket.priority]?.label}
                      </Badge>
                      <p className="text-slate-500 text-xs mt-2">{ticket.messages?.length || 1} mesaj</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Ticket Dialog */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Yeni Destek Talebi</DialogTitle>
            <DialogDescription className="text-slate-400">
              Sorununuzu detaylı açıklayın, en kısa sürede dönüş yapacağız.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Kategori</Label>
                <Select value={newTicket.category} onValueChange={(v) => setNewTicket({...newTicket, category: v})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Öncelik</Label>
                <Select value={newTicket.priority} onValueChange={(v) => setNewTicket({...newTicket, priority: v})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-slate-300">Konu</Label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Sorununuzun kısa özeti"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Mesaj</Label>
              <Textarea
                value={newTicket.message}
                onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                placeholder="Sorununuzu detaylı açıklayın..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTicketOpen(false)} className="border-slate-600">
              İptal
            </Button>
            <Button onClick={handleCreateTicket} className="bg-accent hover:bg-accent/80">
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              <span className="font-mono text-purple-400">{selectedTicket?.ticket_number}</span>
              <span className="ml-3">{selectedTicket?.subject}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Status Info */}
              <div className="flex gap-2 mb-4">
                <Badge variant="outline" className={STATUS_CONFIG[selectedTicket.status]?.color}>
                  {STATUS_CONFIG[selectedTicket.status]?.label}
                </Badge>
                <Badge className={PRIORITY_CONFIG[selectedTicket.priority]?.color}>
                  {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2" style={{ maxHeight: '350px' }}>
                {selectedTicket.messages?.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'support' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.sender_type === 'support' ? 'bg-purple-600/30 border border-purple-500/30' : 'bg-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-medium ${msg.sender_type === 'support' ? 'text-purple-300' : 'text-slate-300'}`}>
                          {msg.sender_type === 'support' ? 'Destek Ekibi' : 'Siz'}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="text-white whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Yanıtınızı yazın..."
                    className="bg-slate-700 border-slate-600 text-white resize-none"
                    rows={2}
                  />
                  <Button onClick={handleReply} className="bg-accent hover:bg-accent/80 self-end">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <div className="text-center py-4 text-slate-500 border-t border-slate-700">
                  Bu talep kapatılmıştır. Yeni bir sorun için yeni talep oluşturun.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Support;
