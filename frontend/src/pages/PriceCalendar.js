import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import getApiUrl from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Car,
  DollarSign,
  Settings,
  Filter,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Wrench,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  available: 'bg-green-500/80 hover:bg-green-500',
  rented: 'bg-red-500/80 hover:bg-red-500',
  reserved: 'bg-yellow-500/80 hover:bg-yellow-500',
  service: 'bg-blue-500/80 hover:bg-blue-500',
  unavailable: 'bg-gray-500/80 hover:bg-gray-500'
};

const STATUS_LABELS = {
  available: 'Müsait',
  rented: 'Kirada',
  reserved: 'Rezerve',
  service: 'Serviste',
  unavailable: 'Müsait Değil'
};

const STATUS_ICONS = {
  available: Check,
  rented: Car,
  reserved: Clock,
  service: Wrench,
  unavailable: X
};

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const PriceCalendar = () => {
  const [vehicles, setVehicles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [priceRules, setPriceRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [priceForm, setPriceForm] = useState({
    daily_price: '',
    weekend_price: '',
    weekly_price: '',
    monthly_price: ''
  });

  const [statusForm, setStatusForm] = useState({
    status: 'available',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [vehiclesRes, reservationsRes, priceRulesRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/vehicles`),
        axios.get(`${getApiUrl()}/api/reservations`),
        axios.get(`${getApiUrl()}/api/price-rules`).catch(() => ({ data: [] }))
      ]);
      setVehicles(vehiclesRes.data);
      setReservations(reservationsRes.data);
      setPriceRules(priceRulesRes.data);
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    const days = [];
    
    // Previous month padding
    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(year, month, -startDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  // Get vehicle status for a specific date
  const getVehicleStatusForDate = (vehicle, date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check reservations
    const reservation = reservations.find(r => {
      if (r.vehicle_id !== vehicle.id) return false;
      const start = new Date(r.start_date).toISOString().split('T')[0];
      const end = new Date(r.end_date).toISOString().split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
    
    if (reservation) {
      if (reservation.status === 'delivered' || reservation.status === 'confirmed') {
        return 'rented';
      }
      if (reservation.status === 'created') {
        return 'reserved';
      }
    }
    
    // Check vehicle base status
    if (vehicle.status === 'service') return 'service';
    if (vehicle.status === 'rented') return 'rented';
    
    return 'available';
  };

  // Get price for a specific vehicle and date
  const getPriceForDate = (vehicle, date) => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check specific price rules
    const rule = priceRules.find(r => {
      if (r.vehicle_id !== vehicle.id) return false;
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return date >= start && date <= end;
    });
    
    if (rule) {
      return isWeekend ? (rule.weekend_price || rule.daily_price) : rule.daily_price;
    }
    
    // Return base price
    return isWeekend ? (vehicle.weekend_price || vehicle.daily_price) : vehicle.daily_price;
  };

  // Handle date click
  const handleDateClick = (vehicle, date) => {
    if (isMultiSelect) {
      const dateStr = date.toISOString();
      const existing = selectedDates.find(d => d.date.toISOString() === dateStr && d.vehicleId === vehicle.id);
      
      if (existing) {
        setSelectedDates(selectedDates.filter(d => !(d.date.toISOString() === dateStr && d.vehicleId === vehicle.id)));
      } else {
        setSelectedDates([...selectedDates, { date, vehicleId: vehicle.id }]);
      }
    } else {
      setSelectedVehicle(vehicle);
      setSelectedDates([{ date, vehicleId: vehicle.id }]);
    }
  };

  // Open price dialog
  const openPriceDialog = () => {
    if (selectedDates.length === 0) {
      toast.error('Lütfen önce tarih seçin');
      return;
    }
    
    const vehicle = vehicles.find(v => v.id === selectedDates[0].vehicleId);
    if (vehicle) {
      setPriceForm({
        daily_price: vehicle.daily_price?.toString() || '',
        weekend_price: vehicle.weekend_price?.toString() || '',
        weekly_price: vehicle.weekly_price?.toString() || '',
        monthly_price: vehicle.monthly_price?.toString() || ''
      });
    }
    setIsPriceDialogOpen(true);
  };

  // Save price changes
  const handleSavePrice = async () => {
    try {
      const vehicleIds = [...new Set(selectedDates.map(d => d.vehicleId))];
      
      for (const vehicleId of vehicleIds) {
        const dates = selectedDates.filter(d => d.vehicleId === vehicleId);
        const startDate = new Date(Math.min(...dates.map(d => d.date.getTime())));
        const endDate = new Date(Math.max(...dates.map(d => d.date.getTime())));
        
        await axios.post(`${getApiUrl()}/api/price-rules`, {
          vehicle_id: vehicleId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          daily_price: parseFloat(priceForm.daily_price) || 0,
          weekend_price: parseFloat(priceForm.weekend_price) || 0,
          weekly_price: parseFloat(priceForm.weekly_price) || 0,
          monthly_price: parseFloat(priceForm.monthly_price) || 0
        });
      }
      
      toast.success('Fiyatlar güncellendi');
      setIsPriceDialogOpen(false);
      setSelectedDates([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fiyat güncellenirken hata oluştu');
    }
  };

  // Save status changes
  const handleSaveStatus = async () => {
    try {
      const vehicleIds = [...new Set(selectedDates.map(d => d.vehicleId))];
      
      for (const vehicleId of vehicleIds) {
        await axios.patch(`${getApiUrl()}/api/vehicles/${vehicleId}/status`, {
          status: statusForm.status
        });
      }
      
      toast.success('Durum güncellendi');
      setIsStatusDialogOpen(false);
      setSelectedDates([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Durum güncellenirken hata oluştu');
    }
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (filterCategory !== 'all' && v.category !== filterCategory) return false;
    return true;
  });

  const calendarDays = generateCalendarDays();
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Fiyat & Müsaitlik Takvimi</h1>
          <p className="text-slate-400">Araç fiyatlarını ve müsaitlik durumunu yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isMultiSelect ? "default" : "outline"}
            onClick={() => {
              setIsMultiSelect(!isMultiSelect);
              setSelectedDates([]);
            }}
            className={isMultiSelect ? "bg-orange-600" : "border-slate-600 text-slate-300"}
          >
            <Check className="h-4 w-4 mr-2" />
            Çoklu Seçim
          </Button>
          <Button onClick={fetchData} variant="outline" className="border-slate-600 text-slate-300">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Legend & Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const Icon = STATUS_ICONS[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${STATUS_COLORS[key]}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-slate-300 text-sm">{label}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="available">Müsait</SelectItem>
                  <SelectItem value="rented">Kirada</SelectItem>
                  <SelectItem value="service">Serviste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigateMonth(-1)} className="text-slate-300 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-white">
          {MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <Button variant="ghost" onClick={() => navigateMonth(1)} className="text-slate-300 hover:text-white">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Action Buttons */}
      {selectedDates.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
          <span className="text-orange-400">
            {selectedDates.length} tarih seçildi
          </span>
          <Button size="sm" onClick={openPriceDialog} className="bg-green-600 hover:bg-green-700">
            <DollarSign className="h-4 w-4 mr-1" />
            Fiyat Belirle
          </Button>
          <Button size="sm" onClick={() => setIsStatusDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Settings className="h-4 w-4 mr-1" />
            Durum Değiştir
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedDates([])} className="border-slate-600 text-slate-300">
            <X className="h-4 w-4 mr-1" />
            Temizle
          </Button>
        </div>
      )}

      {/* Calendar Grid */}
      <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
        <ScrollArea className="h-[600px]">
          <div className="min-w-[1200px]">
            {/* Header Row - Days */}
            <div className="grid grid-cols-[200px_repeat(7,1fr)] sticky top-0 bg-slate-800 z-10 border-b border-slate-700">
              <div className="p-3 font-semibold text-slate-400">Araç</div>
              {DAYS_TR.map(day => (
                <div key={day} className="p-3 text-center font-semibold text-slate-400">{day}</div>
              ))}
            </div>

            {/* Calendar Weeks */}
            {[0, 1, 2, 3, 4, 5].map(weekIndex => (
              <React.Fragment key={weekIndex}>
                {/* Date Numbers Row */}
                <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-slate-700/50">
                  <div className="p-2 text-slate-500 text-xs">
                    {weekIndex === 0 && 'Hafta ' + (weekIndex + 1)}
                  </div>
                  {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                    const dateStr = day.date.toISOString().split('T')[0];
                    const isToday = dateStr === today;
                    return (
                      <div 
                        key={dayIndex} 
                        className={`p-2 text-center text-sm ${
                          day.isCurrentMonth ? 'text-slate-300' : 'text-slate-600'
                        } ${isToday ? 'bg-orange-500/20 font-bold' : ''}`}
                      >
                        {day.date.getDate()}
                      </div>
                    );
                  })}
                </div>

                {/* Vehicle Rows for this week */}
                {filteredVehicles.map(vehicle => (
                  <div key={`${weekIndex}-${vehicle.id}`} className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-slate-700/30 hover:bg-slate-700/20">
                    {/* Vehicle Info */}
                    {weekIndex === 0 ? (
                      <div className="p-2 flex items-center gap-2 sticky left-0 bg-slate-800/90">
                        <Car className="h-4 w-4 text-orange-500" />
                        <div className="truncate">
                          <p className="text-white text-sm font-medium truncate">{vehicle.plate}</p>
                          <p className="text-slate-400 text-xs truncate">{vehicle.brand} {vehicle.model}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 sticky left-0 bg-slate-800/90" />
                    )}

                    {/* Day Cells */}
                    {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                      const status = getVehicleStatusForDate(vehicle, day.date);
                      const price = getPriceForDate(vehicle, day.date);
                      const dateStr = day.date.toISOString();
                      const isSelected = selectedDates.some(
                        d => d.date.toISOString() === dateStr && d.vehicleId === vehicle.id
                      );
                      const Icon = STATUS_ICONS[status];

                      return (
                        <div
                          key={dayIndex}
                          onClick={() => day.isCurrentMonth && handleDateClick(vehicle, day.date)}
                          className={`
                            p-1 cursor-pointer transition-all relative
                            ${day.isCurrentMonth ? '' : 'opacity-30 pointer-events-none'}
                            ${isSelected ? 'ring-2 ring-orange-500 ring-inset' : ''}
                          `}
                        >
                          <div className={`
                            rounded p-1 h-full flex flex-col items-center justify-center
                            ${STATUS_COLORS[status]}
                            ${isSelected ? 'scale-95' : ''}
                          `}>
                            <Icon className="h-3 w-3 text-white mb-0.5" />
                            <span className="text-white text-xs font-medium">
                              ₺{price || '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Price Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Fiyat Belirle</DialogTitle>
            <DialogDescription className="text-slate-400">
              Seçili tarihler için fiyat güncellemesi yapın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Günlük Fiyat (₺)</Label>
                <Input
                  type="number"
                  value={priceForm.daily_price}
                  onChange={(e) => setPriceForm({...priceForm, daily_price: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-slate-300">Hafta Sonu Fiyat (₺)</Label>
                <Input
                  type="number"
                  value={priceForm.weekend_price}
                  onChange={(e) => setPriceForm({...priceForm, weekend_price: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-slate-300">Haftalık Fiyat (₺)</Label>
                <Input
                  type="number"
                  value={priceForm.weekly_price}
                  onChange={(e) => setPriceForm({...priceForm, weekly_price: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-slate-300">Aylık Fiyat (₺)</Label>
                <Input
                  type="number"
                  value={priceForm.monthly_price}
                  onChange={(e) => setPriceForm({...priceForm, monthly_price: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)} className="border-slate-600 text-slate-300">
              İptal
            </Button>
            <Button onClick={handleSavePrice} className="bg-orange-600 hover:bg-orange-700">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Durum Değiştir</DialogTitle>
            <DialogDescription className="text-slate-400">
              Seçili araçların durumunu güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300">Yeni Durum</Label>
              <Select value={statusForm.status} onValueChange={(v) => setStatusForm({...statusForm, status: v})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="available">Müsait</SelectItem>
                  <SelectItem value="service">Serviste</SelectItem>
                  <SelectItem value="unavailable">Müsait Değil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} className="border-slate-600 text-slate-300">
              İptal
            </Button>
            <Button onClick={handleSaveStatus} className="bg-orange-600 hover:bg-orange-700">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceCalendar;
