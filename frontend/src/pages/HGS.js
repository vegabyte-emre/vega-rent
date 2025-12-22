import React, { useState, useEffect } from "react";
import axios from "axios";
import getApiUrl from '../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  CreditCard, 
  Plus, 
  RefreshCw, 
  Car, 
  AlertTriangle,
  TrendingDown,
  MapPin,
  Clock,
  Wallet,
  History
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatCurrency } from "../lib/utils";

export function HGS() {
  const [tags, setTags] = useState([]);
  const [passages, setPassages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showPassageDialog, setShowPassageDialog] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  
  const [newTag, setNewTag] = useState({
    vehicle_id: "",
    vehicle_plate: "",
    tag_number: "",
    balance: 0,
    min_balance_alert: 50
  });
  
  const [newBalance, setNewBalance] = useState({ balance: 0, note: "" });
  const [newPassage, setNewPassage] = useState({
    location: "",
    amount: 0,
    direction: "Gecis",
    note: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tagsRes, summaryRes, passagesRes, vehiclesRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/hgs/tags`),
        axios.get(`${getApiUrl()}/api/hgs/summary`),
        axios.get(`${getApiUrl()}/api/hgs/passages?limit=20`),
        axios.get(`${getApiUrl()}/api/vehicles`)
      ]);
      setTags(tagsRes.data);
      setSummary(summaryRes.data);
      setPassages(passagesRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      toast.error("Veriler yuklenirken hata olustu");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    try {
      await axios.post(`${getApiUrl()}/api/hgs/tags`, newTag);
      toast.success("HGS etiketi eklendi");
      setShowAddDialog(false);
      setNewTag({ vehicle_id: "", vehicle_plate: "", tag_number: "", balance: 0, min_balance_alert: 50 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Etiket eklenemedi");
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedTag) return;
    try {
      const result = await axios.put(`${getApiUrl()}/api/hgs/tags/${selectedTag.id}/balance`, newBalance);
      toast.success("Bakiye guncellendi");
      if (result.data.alert) {
        toast.warning(result.data.alert.message);
      }
      setShowBalanceDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Bakiye guncellenemedi");
    }
  };

  const handleAddPassage = async () => {
    if (!selectedTag) return;
    try {
      await axios.post(`${getApiUrl()}/api/hgs/tags/${selectedTag.id}/passages`, {
        ...newPassage,
        passage_time: new Date().toISOString()
      });
      toast.success("Gecis kaydedildi");
      setShowPassageDialog(false);
      setNewPassage({ location: "", amount: 0, direction: "Gecis", note: "" });
      fetchData();
    } catch (error) {
      toast.error("Gecis kaydedilemedi");
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (!window.confirm("Bu HGS etiketini silmek istediginizden emin misiniz?")) return;
    try {
      await axios.delete(`${getApiUrl()}/api/hgs/tags/${tagId}`);
      toast.success("HGS etiketi silindi");
      fetchData();
    } catch (error) {
      toast.error("Etiket silinemedi");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="hgs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HGS Takip</h1>
          <p className="text-muted-foreground mt-1">Hizli Gecis Sistemi etiket ve bakiye yonetimi</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                HGS Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni HGS Etiketi</DialogTitle>
                <DialogDescription>Araca HGS etiketi tanimlayın</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Arac</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newTag.vehicle_id}
                    onChange={(e) => {
                      const vehicle = vehicles.find(v => v.id === e.target.value);
                      setNewTag({
                        ...newTag,
                        vehicle_id: e.target.value,
                        vehicle_plate: vehicle?.plate || ""
                      });
                    }}
                  >
                    <option value="">Arac Secin</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>HGS Etiket No</Label>
                  <Input
                    value={newTag.tag_number}
                    onChange={(e) => setNewTag({...newTag, tag_number: e.target.value})}
                    placeholder="HGS etiket numarasi"
                  />
                </div>
                <div>
                  <Label>Baslangic Bakiyesi (TL)</Label>
                  <Input
                    type="number"
                    value={newTag.balance}
                    onChange={(e) => setNewTag({...newTag, balance: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Minimum Bakiye Uyarisi (TL)</Label>
                  <Input
                    type="number"
                    value={newTag.min_balance_alert}
                    onChange={(e) => setNewTag({...newTag, min_balance_alert: parseFloat(e.target.value) || 50})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Iptal</Button>
                <Button onClick={handleAddTag}>Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Etiket</p>
                  <p className="text-2xl font-bold">{summary.total_tags}</p>
                </div>
                <CreditCard className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Bakiye</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_balance)}</p>
                </div>
                <Wallet className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dusuk Bakiye</p>
                  <p className="text-2xl font-bold text-amber-600">{summary.low_balance_count}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bu Ay Gecis</p>
                  <p className="text-2xl font-bold">{summary.total_passages_this_month}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HGS Tags List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              HGS Etiketleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henuz HGS etiketi tanimlanmamis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tags.map(tag => (
                  <div key={tag.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tag.low_balance ? 'bg-amber-100' : 'bg-primary/10'}`}>
                          <Car className={`h-5 w-5 ${tag.low_balance ? 'text-amber-600' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="font-mono font-medium">{tag.vehicle_plate}</p>
                          <p className="text-xs text-muted-foreground">Etiket: {tag.tag_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tag.low_balance ? 'text-amber-600' : ''}`}>
                          {formatCurrency(tag.balance)}
                        </p>
                        {tag.low_balance && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Dusuk
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTag(tag);
                          setNewBalance({ balance: tag.balance, note: "" });
                          setShowBalanceDialog(true);
                        }}
                      >
                        <Wallet className="h-3 w-3 mr-1" />
                        Bakiye
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTag(tag);
                          setShowPassageDialog(true);
                        }}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Gecis Ekle
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Passages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Son Gecisler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {passages.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henuz gecis kaydi yok</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plaka</TableHead>
                    <TableHead>Konum</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passages.map(passage => (
                    <TableRow key={passage.id}>
                      <TableCell className="font-mono">{passage.vehicle_plate}</TableCell>
                      <TableCell>{passage.location}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(passage.amount)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(passage.passage_time)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance Update Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bakiye Guncelle</DialogTitle>
            <DialogDescription>
              {selectedTag?.vehicle_plate} - Mevcut: {formatCurrency(selectedTag?.balance || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Yeni Bakiye (TL)</Label>
              <Input
                type="number"
                value={newBalance.balance}
                onChange={(e) => setNewBalance({...newBalance, balance: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Not (Opsiyonel)</Label>
              <Input
                value={newBalance.note}
                onChange={(e) => setNewBalance({...newBalance, note: e.target.value})}
                placeholder="Yukleme notu"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBalanceDialog(false)}>Iptal</Button>
            <Button onClick={handleUpdateBalance}>Guncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passage Dialog */}
      <Dialog open={showPassageDialog} onOpenChange={setShowPassageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gecis Kaydi Ekle</DialogTitle>
            <DialogDescription>{selectedTag?.vehicle_plate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Gecis Noktasi</Label>
              <Input
                value={newPassage.location}
                onChange={(e) => setNewPassage({...newPassage, location: e.target.value})}
                placeholder="Ornegin: FSM Koprusu, O-4 Gebze"
              />
            </div>
            <div>
              <Label>Tutar (TL)</Label>
              <Input
                type="number"
                value={newPassage.amount}
                onChange={(e) => setNewPassage({...newPassage, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Not (Opsiyonel)</Label>
              <Input
                value={newPassage.note}
                onChange={(e) => setNewPassage({...newPassage, note: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPassageDialog(false)}>Iptal</Button>
            <Button onClick={handleAddPassage}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Manuel Takip Modu</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                HGS bakiye ve gecis kayitlari manuel olarak guncellenmektedir. 
                Otomatik PTT HGS API entegrasyonu icin sistem yoneticisi ile iletisime gecin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
