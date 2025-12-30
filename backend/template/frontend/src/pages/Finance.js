import getApiUrl from '../config/api';
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { formatCurrency } from "../lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Calendar,
  Download,
  FileText,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Building2,
  Car,
  Users,
  Plus,
  Eye,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPie, Pie, Cell, Legend, Area, AreaChart } from "recharts";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Finance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterType, setFilterType] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  
  // New transaction dialog
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: 'income',
    category: 'rental',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    branch_id: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      
      if (filterBranch !== 'all') {
        params.append('branch_id', filterBranch);
      }
      
      const [statsRes, transactionsRes, reservationsRes, branchesRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/finance/stats?${params}`, { headers }).catch(() => ({ data: null })),
        axios.get(`${getApiUrl()}/api/finance/transactions?${params}`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${getApiUrl()}/api/reservations`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${getApiUrl()}/api/branches`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      // Calculate stats from reservations if no finance endpoint
      const completedReservations = reservationsRes.data.filter(r => 
        r.status === 'completed' || r.status === 'active'
      );
      
      const totalRevenue = completedReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const monthlyRevenue = completedReservations
        .filter(r => {
          const date = new Date(r.start_date);
          return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
        })
        .reduce((sum, r) => sum + (r.total_amount || 0), 0);
      
      setStats(statsRes.data || {
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        total_expenses: 0,
        net_profit: monthlyRevenue,
        pending_payments: completedReservations.filter(r => r.payment_status === 'pending').length,
        completed_payments: completedReservations.filter(r => r.payment_status === 'paid').length
      });
      
      setTransactions(transactionsRes.data || []);
      setReservations(reservationsRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (error) {
      console.error('Finance data error:', error);
      toast.error('Finans verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [dateRange, filterBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate monthly chart data from reservations
  const monthlyChartData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });
      const monthReservations = reservations.filter(r => {
        const rDate = new Date(r.start_date);
        return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
      });
      const revenue = monthReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      months.push({
        name: monthName,
        gelir: revenue,
        rezervasyon: monthReservations.length
      });
    }
    return months;
  }, [reservations]);

  // Category breakdown
  const categoryData = React.useMemo(() => {
    const categories = {};
    reservations.forEach(r => {
      const cat = r.vehicle_segment || 'Diğer';
      categories[cat] = (categories[cat] || 0) + (r.total_amount || 0);
    });
    return Object.entries(categories).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length]
    }));
  }, [reservations]);

  // Filtered transactions
  const filteredTransactions = React.useMemo(() => {
    let result = [...transactions];
    
    // Add reservations as income transactions
    const reservationTransactions = reservations
      .filter(r => r.status === 'completed' || r.status === 'active')
      .map(r => ({
        id: r.id,
        type: 'income',
        category: 'rental',
        amount: r.total_amount || 0,
        description: `Kiralama - ${r.vehicle_plate || 'Araç'}`,
        date: r.start_date,
        customer_name: r.customer_name,
        branch_id: r.branch_id
      }));
    
    result = [...result, ...reservationTransactions];
    
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.customer_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort by date
    result.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return result;
  }, [transactions, reservations, filterType, searchQuery]);

  // Export functions
  const exportToXLSX = async () => {
    setIsExporting(true);
    try {
      // Create CSV content
      const headers = ['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Tutar'];
      const rows = filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString('tr-TR'),
        t.type === 'income' ? 'Gelir' : 'Gider',
        t.category || '-',
        t.description || '-',
        t.amount || 0
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finans-raporu-${dateRange.start}-${dateRange.end}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Excel raporu indirildi');
    } catch (error) {
      toast.error('Dışa aktarma başarısız');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Create printable HTML
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Finans Raporu</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .summary { display: flex; gap: 20px; margin-bottom: 20px; }
            .summary-card { padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .income { color: #10B981; }
            .expense { color: #EF4444; }
          </style>
        </head>
        <body>
          <h1>Finans Raporu</h1>
          <p>Tarih Aralığı: ${dateRange.start} - ${dateRange.end}</p>
          <div class="summary">
            <div class="summary-card">
              <h3>Toplam Gelir</h3>
              <p class="income">${formatCurrency(stats?.total_revenue || stats?.monthly_revenue || 0)}</p>
            </div>
            <div class="summary-card">
              <h3>Toplam Gider</h3>
              <p class="expense">${formatCurrency(stats?.total_expenses || 0)}</p>
            </div>
            <div class="summary-card">
              <h3>Net Kar</h3>
              <p>${formatCurrency(stats?.net_profit || stats?.monthly_revenue || 0)}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Açıklama</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.slice(0, 100).map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString('tr-TR')}</td>
                  <td>${t.type === 'income' ? 'Gelir' : 'Gider'}</td>
                  <td>${t.description || '-'}</td>
                  <td class="${t.type === 'income' ? 'income' : 'expense'}">${formatCurrency(t.amount || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      toast.success('PDF raporu hazırlandı');
    } catch (error) {
      toast.error('PDF oluşturulamadı');
    } finally {
      setIsExporting(false);
    }
  };

  // Save new transaction
  const handleSaveTransaction = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${getApiUrl()}/api/finance/transactions`, transactionForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İşlem kaydedildi');
      setIsNewTransactionOpen(false);
      setTransactionForm({
        type: 'income',
        category: 'rental',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        branch_id: ''
      });
      fetchData();
    } catch (error) {
      toast.error('İşlem kaydedilemedi');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finans</h1>
          <p className="text-muted-foreground mt-1">Gelir, gider ve finansal raporlar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={() => setIsNewTransactionOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni İşlem
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Gelir</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.total_revenue || stats?.monthly_revenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Bu ay
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Gider</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats?.total_expenses || 0)}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-red-600">
              <ArrowDownRight className="h-4 w-4 mr-1" />
              Bu ay
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Kar</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency((stats?.total_revenue || stats?.monthly_revenue || 0) - (stats?.total_expenses || 0))}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Ödeme</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats?.pending_payments || 0}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Receipt className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Başlangıç:</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Bitiş:</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-40"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="income">Gelir</SelectItem>
                <SelectItem value="expense">Gider</SelectItem>
              </SelectContent>
            </Select>
            {branches.length > 0 && (
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Şube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={exportToXLSX} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="charts">Grafikler</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Aylık Gelir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="gelir" stroke="#10B981" fillOpacity={1} fill="url(#colorGelir)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Kategori Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Son İşlemler</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 10).map((t, idx) => (
                    <TableRow key={t.id || idx}>
                      <TableCell>{new Date(t.date).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>{t.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'income' ? 'default' : 'destructive'}>
                          {t.type === 'income' ? 'Gelir' : 'Gider'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tüm İşlemler</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t, idx) => (
                    <TableRow key={t.id || idx}>
                      <TableCell>{new Date(t.date).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>{t.description || '-'}</TableCell>
                      <TableCell className="capitalize">{t.category || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'income' ? 'default' : 'destructive'}>
                          {t.type === 'income' ? 'Gelir' : 'Gider'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        İşlem bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Aylık Karşılaştırma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="gelir" name="Gelir" fill="#10B981" />
                      <Bar dataKey="rezervasyon" name="Rezervasyon" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gelir Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="gelir" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Transaction Dialog */}
      <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni İşlem Ekle</DialogTitle>
            <DialogDescription>Gelir veya gider kaydı oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tür</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Gelir</SelectItem>
                    <SelectItem value="expense">Gider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={transactionForm.category} onValueChange={(v) => setTransactionForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">Kiralama</SelectItem>
                    <SelectItem value="maintenance">Bakım</SelectItem>
                    <SelectItem value="fuel">Yakıt</SelectItem>
                    <SelectItem value="insurance">Sigorta</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tutar (₺)</Label>
              <Input
                type="number"
                placeholder="0"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                placeholder="İşlem açıklaması"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTransactionOpen(false)}>İptal</Button>
            <Button onClick={handleSaveTransaction}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Finance;
