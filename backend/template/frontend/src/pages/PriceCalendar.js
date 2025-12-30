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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Car,
  Calendar,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';

// Renk paleti - farklı rezervasyonlar için
const RESERVATION_COLORS = [
  { bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-l-yellow-500', text: 'text-yellow-800 dark:text-yellow-200' },
  { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-l-blue-500', text: 'text-blue-800 dark:text-blue-200' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-l-orange-500', text: 'text-orange-800 dark:text-orange-200' },
  { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-l-green-500', text: 'text-green-800 dark:text-green-200' },
  { bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-l-purple-500', text: 'text-purple-800 dark:text-purple-200' },
  { bg: 'bg-pink-100 dark:bg-pink-900/40', border: 'border-l-pink-500', text: 'text-pink-800 dark:text-pink-200' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-l-cyan-500', text: 'text-cyan-800 dark:text-cyan-200' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-l-amber-500', text: 'text-amber-800 dark:text-amber-200' },
];

const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const PriceCalendar = () => {
  const [vehicles, setVehicles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(31);
  const [filterVehicle, setFilterVehicle] = useState('all');
  
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
    total_amount: '',
    notes: ''
  });

  // Responsive: ekran genişliğine göre gün sayısı
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDaysToShow(7); // Mobile: 7 gün
      } else if (width < 1024) {
        setDaysToShow(14); // Tablet: 14 gün
      } else {
        setDaysToShow(31); // Desktop: 31 gün
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Takvim günlerini hesapla - bugünden başlayarak
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date(startDate);
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isToday: i === 0 && startDate.toDateString() === new Date().toDateString(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        dateStr: date.toISOString().split('T')[0]
      });
    }
    
    return days;
  }, [startDate, daysToShow]);

  // Araç için rezervasyonları getir
  const getVehicleReservations = useCallback((vehicleId) => {
    return reservations.filter(r => r.vehicle_id === vehicleId);
  }, [reservations]);

  // Rezervasyonun görüntüleneceği pozisyonu hesapla
  const getReservationPosition = useCallback((reservation, days) => {
    const resStart = new Date(reservation.start_date);
    const resEnd = new Date(reservation.end_date);
    resStart.setHours(0, 0, 0, 0);
    resEnd.setHours(0, 0, 0, 0);
    
    const calStart = days[0].date;
    const calEnd = days[days.length - 1].date;
    
    // Rezervasyon takvim aralığında mı?
    if (resEnd < calStart || resStart > calEnd) {
      return null;
    }
    
    // Başlangıç indeksi
    let startIndex = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[i].date >= resStart) {
        startIndex = i;
        break;
      }
      if (days[i].date < resStart) {
        startIndex = i + 1;
      }
    }
    if (resStart < calStart) startIndex = 0;
    
    // Bitiş indeksi
    let endIndex = days.length - 1;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].date <= resEnd) {
        endIndex = i;
        break;
      }
    }
    
    if (startIndex > endIndex) return null;
    
    return {
      startIndex,
      endIndex,
      span: endIndex - startIndex + 1,
      startsBeforeView: resStart < calStart,
      endsAfterView: resEnd > calEnd
    };
  }, []);

  // Müşteri adını getir
  const getCustomerName = useCallback((customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Müşteri';
    }
    return 'Müşteri';
  }, [customers]);

  // Renk atama (rezervasyon ID'sine göre tutarlı renk)
  const getReservationColor = useCallback((reservationId) => {
    if (!reservationId) return RESERVATION_COLORS[0];
    let hash = 0;
    for (let i = 0; i < reservationId.length; i++) {
      hash = reservationId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % RESERVATION_COLORS.length;
    return RESERVATION_COLORS[index];
  }, []);

  // Navigasyon
  const navigate = (direction) => {
    setStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction * daysToShow));
      return newDate;
    });
  };

  // Bugüne git
  const goToToday = () => {
    setStartDate(new Date());
  };

  // Filtrelenmiş araçlar
  const filteredVehicles = useMemo(() => {
    if (filterVehicle === 'all') return vehicles;
    return vehicles.filter(v => v.id === filterVehicle);
  }, [vehicles, filterVehicle]);

  // Yeni rezervasyon
  const handleNewReservation = (vehicleId = '', date = '') => {
    const today = new Date().toISOString().split('T')[0];
    setReservationForm({
      vehicle_id: vehicleId || '',
      customer_id: '',
      start_date: date || today,
      end_date: date || today,
      daily_rate: '',
      total_amount: '',
      notes: ''
    });
    setIsNewReservationOpen(true);
  };

  // Rezervasyon düzenle
  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation);
    setReservationForm({
      vehicle_id: reservation.vehicle_id || '',
      customer_id: reservation.customer_id || '',
      start_date: reservation.start_date?.split('T')[0] || '',
      end_date: reservation.end_date?.split('T')[0] || '',
      daily_rate: reservation.daily_rate?.toString() || '',
      total_amount: reservation.total_amount?.toString() || '',
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
      setIsEditReservationOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Rezervasyon silinemedi');
    }
  };

  // Gün sayısını hesapla
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Form değişikliğinde toplam hesapla
  useEffect(() => {
    if (reservationForm.daily_rate && reservationForm.start_date && reservationForm.end_date) {
      const days = calculateDays(reservationForm.start_date, reservationForm.end_date);
      const total = days * parseFloat(reservationForm.daily_rate);
      setReservationForm(prev => ({ ...prev, total_amount: total.toString() }));
    }
  }, [reservationForm.daily_rate, reservationForm.start_date, reservationForm.end_date]);

  // Rezervasyon kaydet
  const handleSaveReservation = async (isEdit = false) => {
    if (!reservationForm.vehicle_id) {
      toast.error('Lütfen araç seçin');
      return;
    }
    if (!reservationForm.start_date || !reservationForm.end_date) {
      toast.error('Lütfen tarih seçin');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const data = {
        vehicle_id: reservationForm.vehicle_id,
        customer_id: reservationForm.customer_id || null,
        start_date: reservationForm.start_date,
        end_date: reservationForm.end_date,
        daily_rate: parseFloat(reservationForm.daily_rate) || 0,
        total_amount: parseFloat(reservationForm.total_amount) || 0,
        notes: reservationForm.notes,
        status: 'confirmed'
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

  // Hücre genişliği hesapla
  const cellWidth = useMemo(() => {
    if (daysToShow <= 7) return 'min-w-[80px] w-[80px]';
    if (daysToShow <= 14) return 'min-w-[60px] w-[60px]';
    return 'min-w-[45px] w-[45px]';
  }, [daysToShow]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b bg-card gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Fiyat / Müsaitlik Takvimi</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {MONTHS_TR[startDate.getMonth()]} {startDate.getFullYear()} - {daysToShow} Günlük Görünüm
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tüm Araçlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Araçlar</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => handleNewReservation()} size="sm" className="bg-primary hover:bg-primary/90 whitespace-nowrap">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Yeni Rezervasyon</span>
          </Button>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b bg-muted/30 gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex">
            <Calendar className="h-4 w-4 mr-1" />
            Bugün
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="sm:hidden">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {calendarDays[0]?.dayOfMonth} {MONTHS_TR[calendarDays[0]?.month]} - {calendarDays[calendarDays.length-1]?.dayOfMonth} {MONTHS_TR[calendarDays[calendarDays.length-1]?.month]}
          </span>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          {/* Takvim Başlık Satırı */}
          <div className="flex border-b bg-muted/50 sticky top-0 z-20">
            {/* Araç Listesi Başlığı */}
            <div className="w-36 sm:w-48 min-w-[144px] sm:min-w-[192px] p-2 border-r bg-muted/50 sticky left-0 z-30">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Araç Listesi</span>
            </div>
            
            {/* Gün Başlıkları */}
            <div className="flex">
              {calendarDays.map((day, index) => (
                <div 
                  key={index} 
                  className={`${cellWidth} p-1 sm:p-2 text-center border-r flex-shrink-0 ${
                    day.isToday ? 'bg-primary/20' : day.isWeekend ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {DAYS_TR[day.dayOfWeek]}
                  </div>
                  <div className={`text-xs sm:text-sm font-medium ${day.isToday ? 'text-primary' : ''}`}>
                    {day.dayOfMonth}
                  </div>
                  {(day.dayOfMonth === 1 || index === 0) && (
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground truncate">
                      {MONTHS_TR[day.month]?.substring(0, 3)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Araç Satırları */}
          {filteredVehicles.map((vehicle) => {
            const vehicleReservations = getVehicleReservations(vehicle.id);
            
            return (
              <div key={vehicle.id} className="flex border-b hover:bg-muted/10 group">
                {/* Araç Bilgisi */}
                <div 
                  className="w-36 sm:w-48 min-w-[144px] sm:min-w-[192px] p-2 border-r flex items-center gap-2 bg-card sticky left-0 z-10 cursor-pointer hover:bg-muted/20"
                  onClick={() => handleNewReservation(vehicle.id)}
                >
                  <div className="w-10 h-8 sm:w-12 sm:h-9 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {vehicle.image_url ? (
                      <img 
                        src={vehicle.image_url} 
                        alt={vehicle.plate} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{vehicle.brand} {vehicle.model}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{vehicle.plate}</p>
                  </div>
                </div>
                
                {/* Takvim Hücreleri */}
                <div className="flex relative" style={{ minHeight: '52px' }}>
                  {/* Gün Hücreleri (arka plan) */}
                  {calendarDays.map((day, index) => (
                    <div 
                      key={index} 
                      className={`${cellWidth} border-r flex-shrink-0 cursor-pointer hover:bg-primary/5 transition-colors ${
                        day.isToday ? 'bg-primary/10' : day.isWeekend ? 'bg-muted/20' : ''
                      }`}
                      onClick={() => handleNewReservation(vehicle.id, day.dateStr)}
                    />
                  ))}
                  
                  {/* Rezervasyon Blokları */}
                  {vehicleReservations.map((reservation) => {
                    const position = getReservationPosition(reservation, calendarDays);
                    if (!position) return null;
                    
                    const color = getReservationColor(reservation.id);
                    const customerName = getCustomerName(reservation.customer_id);
                    const totalPrice = reservation.total_amount || 0;
                    
                    // Pozisyon hesapla
                    const cellWidthPx = daysToShow <= 7 ? 80 : daysToShow <= 14 ? 60 : 45;
                    const left = position.startIndex * cellWidthPx + 2;
                    const width = position.span * cellWidthPx - 4;
                    
                    return (
                      <div
                        key={reservation.id}
                        className={`absolute top-1 bottom-1 ${color.bg} ${color.border} border-l-4 rounded-r flex items-center px-1 sm:px-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden group/res`}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReservation(reservation);
                        }}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-1">
                          <span className={`font-bold text-[10px] sm:text-xs whitespace-nowrap ${color.text}`}>
                            {totalPrice > 0 ? `${totalPrice.toLocaleString('tr-TR')} ₺` : ''}
                          </span>
                          {width > 100 && (
                            <span className={`text-[10px] sm:text-xs truncate ${color.text}`}>
                              {customerName}
                            </span>
                          )}
                        </div>
                        
                        {/* Aksiyon Butonları */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/res:opacity-100 transition-opacity flex-shrink-0">
                          <button 
                            className={`p-0.5 sm:p-1 hover:bg-white/50 rounded ${color.text}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditReservation(reservation);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button 
                            className={`p-0.5 sm:p-1 hover:bg-white/50 rounded ${color.text}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReservation(reservation.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
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
        </div>
      </div>
      
      {/* Yeni Rezervasyon Dialog */}
      <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Rezervasyon</DialogTitle>
            <DialogDescription>
              Yeni bir araç rezervasyonu oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Araç *</Label>
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
                  <SelectValue placeholder="Müşteri seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Seçilmedi</SelectItem>
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
                <Label>Başlangıç Tarihi *</Label>
                <Input 
                  type="date" 
                  value={reservationForm.start_date}
                  onChange={(e) => setReservationForm({...reservationForm, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi *</Label>
                <Input 
                  type="date" 
                  value={reservationForm.end_date}
                  onChange={(e) => setReservationForm({...reservationForm, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Toplam Tutar (₺)</Label>
                <Input 
                  type="number" 
                  placeholder="0"
                  value={reservationForm.total_amount}
                  onChange={(e) => setReservationForm({...reservationForm, total_amount: e.target.value})}
                />
              </div>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsNewReservationOpen(false)} className="w-full sm:w-auto">
              İptal
            </Button>
            <Button onClick={() => handleSaveReservation(false)} className="w-full sm:w-auto bg-primary">
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Düzenleme Dialog */}
      <Dialog open={isEditReservationOpen} onOpenChange={setIsEditReservationOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rezervasyon Düzenle</DialogTitle>
            <DialogDescription>
              Rezervasyon bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Araç *</Label>
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
                value={reservationForm.customer_id || ''} 
                onValueChange={(v) => setReservationForm({...reservationForm, customer_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Seçilmedi</SelectItem>
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
                <Label>Başlangıç Tarihi *</Label>
                <Input 
                  type="date" 
                  value={reservationForm.start_date}
                  onChange={(e) => setReservationForm({...reservationForm, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi *</Label>
                <Input 
                  type="date" 
                  value={reservationForm.end_date}
                  onChange={(e) => setReservationForm({...reservationForm, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Toplam Tutar (₺)</Label>
                <Input 
                  type="number" 
                  placeholder="0"
                  value={reservationForm.total_amount}
                  onChange={(e) => setReservationForm({...reservationForm, total_amount: e.target.value})}
                />
              </div>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={() => selectedReservation && handleDeleteReservation(selectedReservation.id)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsEditReservationOpen(false)} className="flex-1 sm:flex-none">
                İptal
              </Button>
              <Button onClick={() => handleSaveReservation(true)} className="flex-1 sm:flex-none bg-primary">
                Kaydet
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceCalendar;
