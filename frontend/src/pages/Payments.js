import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { CreditCard, Search, RefreshCw, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";


export function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/payments`);
      setPayments(response.data);
    } catch (error) {
      toast.error("Ödemeler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: "Tamamlandı", icon: CheckCircle, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
      pending: { label: "Beklemede", icon: Clock, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
      failed: { label: "Başarısız", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    };
    const badge = badges[status] || badges.pending;
    return (
      <Badge className={badge.color}>
        <badge.icon className="h-3 w-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter(
    (p) =>
      p.reservation_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.card_holder?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="payments-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ödemeler</h1>
          <p className="text-muted-foreground mt-1">Ödeme geçmişi ve tahsilat yönetimi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Toplam Gelir</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Toplam İşlem</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">
                {payments.filter((p) => p.status === "completed").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Başarılı Ödeme</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rezervasyon ID veya kart sahibi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="payment-search"
              />
            </div>
            <Button variant="outline" onClick={fetchPayments} data-testid="refresh-payments">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CreditCard className="h-12 w-12 mb-4 opacity-50" />
              <p>Ödeme bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İşlem ID</TableHead>
                    <TableHead>Rezervasyon</TableHead>
                    <TableHead>Kart Sahibi</TableHead>
                    <TableHead>Ödeme Tipi</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.reservation_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{payment.card_holder || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.payment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(payment.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">iyzico Entegrasyonu</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Ödeme altyapısı iyzico ile entegre edilmiştir. Canlı ödeme işlemleri için 
                iyzico hesap bilgilerinizi sisteme tanımlamanız gerekmektedir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
