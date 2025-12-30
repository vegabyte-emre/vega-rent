import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import getApiUrl from '../config/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  RefreshCw,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Car,
  Calendar,
  User
} from 'lucide-react';
import { toast } from 'sonner';

// Renk paleti - farklı rezervasyonlar için
const RESERVATION_COLORS = [
  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
];

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const PriceCalendar = () => {
  const [vehicles, setVehicles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month'
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [isEditReservationOpen, setIsEditReservationOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservationForm, setReservationForm] = useState({
    vehicle_id: '',
    customer_id: '',
    start_date: '',
    end_date: '',
    daily_rate: '',
    notes: ''
  });

  // Veri yükleme
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [vehiclesRes, reservationsRes, customersRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/vehicles`, { headers }),
        axios.get(`${getApiUrl()}/api/reservations`, { headers }),
        axios.get(`${getApiUrl()}/api/customers`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      setVehicles(vehiclesRes.data || []);
      setReservations(reservationsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Takvim günlerini hesapla
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Ayın ilk ve son günü
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Görüntülenecek gün sayısı (ay görünümünde)
    let startDate, endDate, totalDays;
    
    if (viewMode === 'month') {
      // Pazartesi'den başlat
      const firstDayWeekday = firstDayOfMonth.getDay();
      const startOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
      startDate = new Date(year, month, 1 - startOffset);
      totalDays = 35; // 5 hafta
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + totalDays - 1);
    } else if (viewMode === 'week') {
      const currentDay = currentDate.getDay();
      const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - mondayOffset);
      totalDays = 7;
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate = new Date(currentDate);
      totalDays = 1;
      endDate = new Date(currentDate);
    }
    
    // Günleri oluştur
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        dayOfWeek: date.getDay(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
    
    return { days, startDate, endDate, month, year };
  }, [currentDate, viewMode]);

  // Araç için rezervasyonları getir
  const getVehicleReservations = useCallback((vehicleId) => {
    return reservations.filter(r => r.vehicle_id === vehicleId);
  }, [reservations]);

  // Rezervasyonun görüntüleneceği pozisyonu hesapla
  const getReservationPosition = useCallback((reservation, days) => {
    const startDate = new Date(reservation.start_date);
    const endDate = new Date(reservation.end_date);
    
    // Takvim başlangıç ve bitiş tarihleri
    const calendarStart = days[0].date;
    const calendarEnd = days[days.length - 1].date;
    
    // Rezervasyon takvim aralığında mı?
    if (endDate < calendarStart || startDate > calendarEnd) {
      return null;
    }
    
    // Başlangıç ve bitiş indekslerini bul
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < days.length; i++) {
      const dayStr = days[i].date.toDateString();
      if (startDate.toDateString() <= dayStr && startIndex === -1) {
        startIndex = i;
      }
      if (endDate.toDateString() >= dayStr) {
        endIndex = i;
      }
    }
    
    if (startIndex === -1) startIndex = 0;
    if (endIndex === -1 || endIndex >= days.length) endIndex = days.length - 1;
    
    return {
      startIndex,
      endIndex,
      span: endIndex - startIndex + 1
    };
  }, []);

  // Müşteri adını getir
  const getCustomerName = useCallback((customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      return `${customer.first_name} ${customer.last_name}`;
    }
    return 'Müşteri';
  }, [customers]);

  // Renk atama (rezervasyon ID'sine göre tutarlı renk)
  const getReservationColor = useCallback((reservationId) => {
    const index = reservationId ? reservationId.charCodeAt(0) % RESERVATION_COLORS.length : 0;
    return RESERVATION_COLORS[index];
  }, []);

  // Navigasyon
  const navigate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + direction);
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + (direction * 7));
      } else {
        newDate.setDate(newDate.getDate() + direction);
      }
      return newDate;
    });
  };

  // Bugüne git
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filtrelenmiş araçlar
  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    
    if (filterVehicle !== 'all') {
      result = result.filter(v => v.id === filterVehicle);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.plate?.toLowerCase().includes(query) ||
        v.brand?.toLowerCase().includes(query) ||
        v.model?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [vehicles, filterVehicle, searchQuery]);

  // Yeni rezervasyon
  const handleNewReservation = () => {
    setReservationForm({
      vehicle_id: '',
      customer_id: '',
      start_date: '',
      end_date: '',
      daily_rate: '',
      notes: ''
    });
    setIsNewReservationOpen(true);
  };

  // Rezervasyon düzenle
  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation);
    setReservationForm({
      vehicle_id: reservation.vehicle_id,
      customer_id: reservation.customer_id,
      start_date: reservation.start_date?.split('T')[0] || '',
      end_date: reservation.end_date?.split('T')[0] || '',
      daily_rate: reservation.daily_rate?.toString() || '',
      notes: reservation.notes || ''
    });
    setIsEditReservationOpen(true);
  };

  // Rezervasyon sil
  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${getApiUrl()}/api/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Rezervasyon silindi');
      fetchData();
    } catch (error) {
      toast.error('Rezervasyon silinemedi');
    }
  };

  // Rezervasyon kaydet
  const handleSaveReservation = async (isEdit = false) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const data = {
        vehicle_id: reservationForm.vehicle_id,
        customer_id: reservationForm.customer_id,
        start_date: reservationForm.start_date,
        end_date: reservationForm.end_date,
        daily_rate: parseFloat(reservationForm.daily_rate) || 0,
        notes: reservationForm.notes
      };
      
      if (isEdit && selectedReservation) {
        await axios.put(`${getApiUrl()}/api/reservations/${selectedReservation.id}`, data, { headers });
        toast.success('Rezervasyon güncellendi');
        setIsEditReservationOpen(false);
      } else {
        await axios.post(`${getApiUrl()}/api/reservations`, data, { headers });
        toast.success('Rezervasyon oluşturuldu');
        setIsNewReservationOpen(false);
      }
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Araç Kiralam</h1>
          </div>
          
          {/* Araç Filtresi */}
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tüm Araçlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Araçlar</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleNewReservation} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rezervasyon
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        <div className="flex items-center gap-2">
          {/* Araç Listesi Toggle */}
          <Select defaultValue="list">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Araç Listesi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Navigasyon */}
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          {/* Görünüm Seçici */}
          <div className="flex items-center border rounded-md">
            <Button 
              variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('day')}
              className="rounded-r-none"
            >
              Gün
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-none border-x"
            >
              Hafta
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-l-none"
            >
              Ay
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          {/* Diğer butonlar */}
          <Button variant="ghost" size="icon">
            <Filter className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNewReservation}>
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[900px]">
          {/* Takvim Başlık Satırı */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-10">
            {/* Araç Listesi Başlığı */}
            <div className="w-52 min-w-52 p-2 border-r flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Araç Listesi</span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Gün Başlıkları */}
            <div className="flex-1 flex">
              {calendarData.days.map((day, index) => (
                <div 
                  key={index} 
                  className={`flex-1 min-w-[80px] p-2 text-center border-r last:border-r-0 ${
                    day.isToday ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {DAYS_TR[day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1]} {day.dayOfMonth}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Araç Satırları */}
          <ScrollArea className="h-[calc(100vh-220px)]">
            {filteredVehicles.map((vehicle) => {
              const vehicleReservations = getVehicleReservations(vehicle.id);
              
              return (
                <div key={vehicle.id} className="flex border-b hover:bg-muted/20">
                  {/* Araç Bilgisi */}
                  <div className="w-52 min-w-52 p-2 border-r flex items-center gap-3">
                    <div className="w-14 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {vehicle.image_url ? (
                        <img 
                          src={vehicle.image_url} 
                          alt={vehicle.plate} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Car className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{vehicle.brand} {vehicle.model}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.plate}</p>
                    </div>
                  </div>
                  
                  {/* Takvim Hücreleri */}
                  <div className="flex-1 flex relative" style={{ minHeight: '60px' }}>
                    {/* Gün Hücreleri (arka plan çizgileri) */}
                    {calendarData.days.map((day, index) => (
                      <div 
                        key={index} 
                        className={`flex-1 min-w-[80px] border-r last:border-r-0 ${
                          !day.isCurrentMonth ? 'bg-muted/20' : ''
                        } ${day.isToday ? 'bg-primary/5' : ''}`}
                      >
                        <div className="p-1 text-center">
                          <span className={`text-xs ${
                            day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {day.dayOfMonth}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Rezervasyon Blokları */}
                    {vehicleReservations.map((reservation) => {
                      const position = getReservationPosition(reservation, calendarData.days);
                      if (!position) return null;
                      
                      const color = getReservationColor(reservation.id);
                      const customerName = getCustomerName(reservation.customer_id);
                      const totalPrice = reservation.total_amount || (reservation.daily_rate * position.span);
                      
                      // Pozisyon hesapla
                      const leftPercent = (position.startIndex / calendarData.days.length) * 100;
                      const widthPercent = (position.span / calendarData.days.length) * 100;
                      
                      return (
                        <div
                          key={reservation.id}
                          className={`absolute top-1/2 -translate-y-1/2 h-10 mx-1 rounded-md border-l-4 ${color.bg} ${color.border} flex items-center justify-between px-2 cursor-pointer hover:shadow-md transition-shadow group`}
                          style={{
                            left: `calc(${leftPercent}% + 4px)`,
                            width: `calc(${widthPercent}% - 8px)`
                          }}
                          onClick={() => handleEditReservation(reservation)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`font-bold text-sm ${color.text}`}>
                              {totalPrice?.toLocaleString('tr-TR')} ₺
                            </span>
                            <span className={`text-sm truncate ${color.text}`}>
                              {customerName}
                            </span>
                          </div>
                          
                          {/* Aksiyon Butonları */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              className={`p-1 hover:bg-white/50 rounded ${color.text}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditReservation(reservation);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              className={`p-1 hover:bg-white/50 rounded ${color.text}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReservation(reservation.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredVehicles.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Car className="h-8 w-8 mr-3 opacity-50" />
                <span>Araç bulunamadı</span>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      
      {/* Yeni Rezervasyon Dialog */}
      <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Rezervasyon</DialogTitle>
            <DialogDescription>
              Yeni bir araç rezervasyonu oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Araç</Label>
              <Select 
                value={reservationForm.vehicle_id} 
                onValueChange={(v) => setReservationForm({...reservationForm, vehicle_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Araç seçin" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Müşteri</Label>
              <Select 
                value={reservationForm.customer_id} 
                onValueChange={(v) => setReservationForm({...reservationForm, customer_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input 
                  type="date" 
                  value={reservationForm.start_date}
                  onChange={(e) => setReservationForm({...reservationForm, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input 
                  type="date" 
                  value={reservationForm.end_date}
                  onChange={(e) => setReservationForm({...reservationForm, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Günlük Ücret (₺)</Label>
              <Input 
                type="number" 
                placeholder="0"
                value={reservationForm.daily_rate}
                onChange={(e) => setReservationForm({...reservationForm, daily_rate: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Input 
                placeholder="Opsiyonel notlar..."
                value={reservationForm.notes}
                onChange={(e) => setReservationForm({...reservationForm, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewReservationOpen(false)}>
              İptal
            </Button>
            <Button onClick={() => handleSaveReservation(false)} className="bg-orange-500 hover:bg-orange-600">
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Düzenleme Dialog */}
      <Dialog open={isEditReservationOpen} onOpenChange={setIsEditReservationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rezervasyon Düzenle</DialogTitle>
            <DialogDescription>
              Rezervasyon bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Araç</Label>
              <Select 
                value={reservationForm.vehicle_id} 
                onValueChange={(v) => setReservationForm({...reservationForm, vehicle_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Araç seçin" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Müşteri</Label>
              <Select 
                value={reservationForm.customer_id} 
                onValueChange={(v) => setReservationForm({...reservationForm, customer_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input 
                  type="date" 
                  value={reservationForm.start_date}
                  onChange={(e) => setReservationForm({...reservationForm, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input 
                  type="date" 
                  value={reservationForm.end_date}
                  onChange={(e) => setReservationForm({...reservationForm, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Günlük Ücret (₺)</Label>
              <Input 
                type="number" 
                placeholder="0"
                value={reservationForm.daily_rate}
                onChange={(e) => setReservationForm({...reservationForm, daily_rate: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Input 
                placeholder="Opsiyonel notlar..."
                value={reservationForm.notes}
                onChange={(e) => setReservationForm({...reservationForm, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedReservation) {
                  handleDeleteReservation(selectedReservation.id);
                  setIsEditReservationOpen(false);
                }
              }}
            >
              Sil
            </Button>
            <Button variant="outline" onClick={() => setIsEditReservationOpen(false)}>
              İptal
            </Button>
            <Button onClick={() => handleSaveReservation(true)} className="bg-orange-500 hover:bg-orange-600">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceCalendar;
