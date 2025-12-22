import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "../lib/utils";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Car,
  MoreHorizontal,
  Check,
  Truck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";


export function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchReservations();
  }, [statusFilter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const response = await axios.get(`${getApiUrl()}/api/reservations`, { params });
      setReservations(response.data);
    } catch (error) {
      toast.error("Rezervasyonlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reservationId, newStatus) => {
    try {
      await axios.patch(`${getApiUrl()}/api/reservations/${reservationId}/status?status=${newStatus}`);
      toast.success("Rezervasyon durumu güncellendi");
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Durum güncellenirken hata oluştu");
    }
  };

  const filteredReservations = reservations.filter(
    (r) =>
      r.vehicle?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vehicle?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusActions = (status) => {
    const actions = {
      created: [
        { label: "Onayla", value: "confirmed", icon: Check, color: "text-green-500" },
        { label: "İptal Et", value: "cancelled", icon: XCircle, color: "text-red-500" },
      ],
      confirmed: [
        { label: "Teslim Et", value: "delivered", icon: Truck, color: "text-blue-500" },
        { label: "İptal Et", value: "cancelled", icon: XCircle, color: "text-red-500" },
      ],
      delivered: [
        { label: "İade Al", value: "returned", icon: RotateCcw, color: "text-amber-500" },
      ],
      returned: [
        { label: "Kapat", value: "closed", icon: Check, color: "text-green-500" },
      ],
    };
    return actions[status] || [];
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reservations-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rezervasyonlar</h1>
          <p className="text-muted-foreground mt-1">Kiralama rezervasyonlarını yönetin</p>
        </div>
        <Link to="/reservations/new">
          <Button className="gradient-accent text-white" data-testid="new-reservation-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rezervasyon
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Plaka, marka veya müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="reservation-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="reservation-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="created">Oluşturuldu</SelectItem>
                <SelectItem value="confirmed">Onaylandı</SelectItem>
                <SelectItem value="delivered">Teslim Edildi</SelectItem>
                <SelectItem value="returned">İade Edildi</SelectItem>
                <SelectItem value="closed">Kapatıldı</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReservations} data-testid="refresh-reservations">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>Rezervasyon bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Araç</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Tarih Aralığı</TableHead>
                    <TableHead>Toplam Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {reservation.vehicle?.brand} {reservation.vehicle?.model}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {reservation.vehicle?.plate}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{reservation.customer?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{reservation.customer?.phone}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(reservation.start_date)}</p>
                          <p className="text-muted-foreground">- {formatDate(reservation.end_date)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(reservation.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(reservation.status)}>
                          {getStatusLabel(reservation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusActions(reservation.status).length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`reservation-actions-${reservation.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {getStatusActions(reservation.status).map((action) => (
                                <DropdownMenuItem
                                  key={action.value}
                                  onClick={() => updateStatus(reservation.id, action.value)}
                                  className={action.color}
                                >
                                  <action.icon className="h-4 w-4 mr-2" />
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
