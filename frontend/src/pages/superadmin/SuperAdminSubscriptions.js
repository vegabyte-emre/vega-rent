import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import {
  CreditCard,
  Building2,
  TrendingUp,
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Plus,
  Banknote,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { IyzicoPayment } from './IyzicoPayment';

const PLANS = {
  free: { name: 'Deneme', color: 'bg-gray-500', price: 0 },
  starter: { name: 'Başlangıç', color: 'bg-blue-500', price: 999 },
  professional: { name: 'Profesyonel', color: 'bg-purple-500', price: 2499 },
  enterprise: { name: 'Kurumsal', color: 'bg-orange-500', price: 4999 }
};

const STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending_approval: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending_payment: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const STATUS_LABELS = {
  active: 'Aktif',
  pending: 'Bekliyor',
  pending_approval: 'Onay Bekliyor',
  pending_payment: 'Ödeme Bekliyor',
  suspended: 'Askıda',
  provisioning: 'Kuruluyor'
};

export const SuperAdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isIyzicoOpen, setIsIyzicoOpen] = useState(false);
  const [activateForm, setActivateForm] = useState({ plan: 'starter', billingCycle: 'monthly' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'bank_transfer', reference: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, financeRes, paymentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/superadmin/subscriptions`),
        axios.get(`${API_URL}/api/superadmin/finance/summary`),
        axios.get(`${API_URL}/api/superadmin/payments?limit=50`)
      ]);
      setSubscriptions(subsRes.data);
      setFinanceSummary(financeRes.data);
      setPayments(paymentsRes.data.payments || []);
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      await axios.post(
        `${API_URL}/api/superadmin/subscriptions/${selectedCompany.id}/activate?plan=${activateForm.plan}&billing_cycle=${activateForm.billingCycle}`
      );
      toast.success('Abonelik aktifleştirildi');
      setIsActivateOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleRecordPayment = async () => {
    try {
      await axios.post(`${API_URL}/api/superadmin/payments`, {
        company_id: selectedCompany.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        reference_no: paymentForm.reference,
        notes: paymentForm.notes
      });
      toast.success('Ödeme kaydedildi ve abonelik uzatıldı');
      setIsPaymentOpen(false);
      setPaymentForm({ amount: '', method: 'bank_transfer', reference: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleExtend = async (companyId, months) => {
    try {
      await axios.post(`${API_URL}/api/superadmin/subscriptions/${companyId}/extend?months=${months}`);
      toast.success(`Abonelik ${months} ay uzatıldı`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleSuspend = async (companyId) => {
    const reason = window.prompt('Askıya alma sebebi:');
    if (reason === null) return;
    
    try {
      await axios.post(`${API_URL}/api/superadmin/subscriptions/${companyId}/suspend?reason=${encodeURIComponent(reason)}`);
      toast.success('Abonelik askıya alındı');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Abonelik Yönetimi</h1>
          <p className="text-slate-400">Firma abonelikleri ve ödemeleri yönetin</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="border-slate-600 text-slate-300">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Finance Summary Cards */}
      {financeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(financeSummary.total_revenue)}</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-400 text-sm">Bu Ay</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(financeSummary.monthly_revenue)}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-400 text-sm">Bu Yıl</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(financeSummary.yearly_revenue)}</p>
                </div>
                <Calendar className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-orange-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-400 text-sm">Yakında Bitiyor</p>
                  <p className="text-2xl font-bold text-white">{financeSummary.expiring_soon?.length || 0}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-purple-600">
            <Building2 className="h-4 w-4 mr-2" />
            Abonelikler
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-purple-600">
            <Receipt className="h-4 w-4 mr-2" />
            Ödemeler
          </TabsTrigger>
          <TabsTrigger value="expiring" className="data-[state=active]:bg-purple-600">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Yakında Bitiyor
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Firma</TableHead>
                    <TableHead className="text-slate-400">Plan</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400">Bitiş Tarihi</TableHead>
                    <TableHead className="text-slate-400">Toplam Ödeme</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => {
                    const daysRemaining = getDaysRemaining(sub.subscription_end);
                    const plan = PLANS[sub.subscription_plan] || PLANS.free;
                    
                    return (
                      <TableRow key={sub.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{sub.name}</div>
                            <div className="text-sm text-slate-500">{sub.admin_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${plan.color} text-white`}>
                            {plan.name}
                          </Badge>
                          {sub.billing_cycle === 'yearly' && (
                            <Badge variant="outline" className="ml-2 text-xs border-slate-600 text-slate-400">
                              Yıllık
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLES[sub.status]}>
                            {STATUS_LABELS[sub.status] || sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-white">{formatDate(sub.subscription_end)}</div>
                          {daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 && (
                            <div className="text-xs text-orange-400">{daysRemaining} gün kaldı</div>
                          )}
                          {daysRemaining !== null && daysRemaining <= 0 && (
                            <div className="text-xs text-red-400">Süresi doldu</div>
                          )}
                        </TableCell>
                        <TableCell className="text-white">
                          {formatCurrency(sub.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                className="text-purple-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => {
                                  setSelectedCompany(sub);
                                  setIsIyzicoOpen(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                iyzico ile Ödeme
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-green-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => {
                                  setSelectedCompany(sub);
                                  setIsPaymentOpen(true);
                                }}
                              >
                                <Banknote className="h-4 w-4 mr-2" />
                                Manuel Ödeme Kaydet
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-700" />
                              <DropdownMenuItem
                                className="text-blue-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => {
                                  setSelectedCompany(sub);
                                  setIsActivateOpen(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Plan Değiştir
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-700" />
                              <DropdownMenuItem
                                className="text-purple-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleExtend(sub.id, 1)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                +1 Ay Uzat
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-purple-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleExtend(sub.id, 3)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                +3 Ay Uzat
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-700" />
                              {sub.status === 'active' && (
                                <DropdownMenuItem
                                  className="text-red-400 hover:bg-slate-700 cursor-pointer"
                                  onClick={() => handleSuspend(sub.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Askıya Al
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400">Firma</TableHead>
                    <TableHead className="text-slate-400">Tutar</TableHead>
                    <TableHead className="text-slate-400">Yöntem</TableHead>
                    <TableHead className="text-slate-400">Referans</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="text-white">{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="text-white">{payment.company_name}</TableCell>
                      <TableCell className="text-green-400 font-semibold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-slate-300">
                        {payment.payment_method === 'bank_transfer' && 'Havale/EFT'}
                        {payment.payment_method === 'credit_card' && 'Kredi Kartı'}
                        {payment.payment_method === 'iyzico' && 'iyzico'}
                        {payment.payment_method === 'paytr' && 'PayTR'}
                        {payment.payment_method === 'paratika' && 'Paratika'}
                        {payment.payment_method === 'manual' && 'Manuel'}
                      </TableCell>
                      <TableCell className="text-slate-400">{payment.reference_no || '-'}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Tamamlandı
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring Tab */}
        <TabsContent value="expiring">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Yakında Sona Erecek Abonelikler</CardTitle>
              <CardDescription className="text-slate-400">30 gün içinde sona erecek abonelikler</CardDescription>
            </CardHeader>
            <CardContent>
              {financeSummary?.expiring_soon?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Yakında sona erecek abonelik yok</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {financeSummary?.expiring_soon?.map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{company.name}</div>
                        <div className="text-sm text-slate-400">
                          Bitiş: {formatDate(company.subscription_end)} - {getDaysRemaining(company.subscription_end)} gün kaldı
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-500 text-purple-400"
                          onClick={() => handleExtend(company.id, 1)}
                        >
                          +1 Ay
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsPaymentOpen(true);
                          }}
                        >
                          Ödeme Al
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activate/Change Plan Dialog */}
      <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Abonelik Planı Değiştir</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedCompany?.name} için abonelik planını değiştirin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Plan</Label>
              <Select value={activateForm.plan} onValueChange={(v) => setActivateForm({...activateForm, plan: v})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="starter">Başlangıç - ₺999/ay</SelectItem>
                  <SelectItem value="professional">Profesyonel - ₺2,499/ay</SelectItem>
                  <SelectItem value="enterprise">Kurumsal - ₺4,999/ay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Faturalandırma</Label>
              <Select value={activateForm.billingCycle} onValueChange={(v) => setActivateForm({...activateForm, billingCycle: v})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="monthly">Aylık</SelectItem>
                  <SelectItem value="yearly">Yıllık (2 ay bedava)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivateOpen(false)} className="border-slate-600">
              İptal
            </Button>
            <Button onClick={handleActivate} className="bg-purple-600 hover:bg-purple-700">
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Ödeme Kaydet</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedCompany?.name} için ödeme kaydı oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Tutar (₺)</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="999"
              />
            </div>
            <div>
              <Label className="text-slate-300">Ödeme Yöntemi</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({...paymentForm, method: v})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="bank_transfer">Havale/EFT</SelectItem>
                  <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                  <SelectItem value="iyzico">iyzico</SelectItem>
                  <SelectItem value="paytr">PayTR</SelectItem>
                  <SelectItem value="paratika">Paratika</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Referans No (İsteğe Bağlı)</Label>
              <Input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Dekont/İşlem No"
              />
            </div>
            <div>
              <Label className="text-slate-300">Not (İsteğe Bağlı)</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ödeme hakkında not..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)} className="border-slate-600">
              İptal
            </Button>
            <Button onClick={handleRecordPayment} className="bg-green-600 hover:bg-green-700">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* iyzico Payment Dialog */}
      {isIyzicoOpen && selectedCompany && (
        <IyzicoPayment
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
          onSuccess={() => {
            setIsIyzicoOpen(false);
            fetchData();
            toast.success('Ödeme başarıyla alındı');
          }}
          onClose={() => setIsIyzicoOpen(false)}
        />
      )}
    </div>
  );
};

export default SuperAdminSubscriptions;
