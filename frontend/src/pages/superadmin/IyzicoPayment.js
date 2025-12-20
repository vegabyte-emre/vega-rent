import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
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
import { Label } from '../../components/ui/label';
import {
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLANS = {
  starter: {
    name: 'Başlangıç',
    monthly: 999,
    yearly: 9990,
    features: ['50 Araç', '3 Kullanıcı', 'E-posta Desteği']
  },
  professional: {
    name: 'Profesyonel',
    monthly: 2499,
    yearly: 24990,
    features: ['200 Araç', '10 Kullanıcı', 'Öncelikli Destek', 'API Erişimi']
  },
  enterprise: {
    name: 'Kurumsal',
    monthly: 4999,
    yearly: 49990,
    features: ['Sınırsız Araç', 'Sınırsız Kullanıcı', '7/24 Destek', 'Özel Entegrasyonlar']
  }
};

export const IyzicoPayment = ({ companyId, companyName, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [iyzicoConfigured, setIyzicoConfigured] = useState(false);
  const [checkoutContent, setCheckoutContent] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [step, setStep] = useState('select'); // select, checkout, processing

  useEffect(() => {
    checkIyzicoStatus();
  }, []);

  const checkIyzicoStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payment/iyzico/status`);
      setIyzicoConfigured(response.data.configured);
    } catch (error) {
      console.error('iyzico status check failed:', error);
    }
  };

  const initializeCheckout = async () => {
    if (!iyzicoConfigured) {
      toast.error('iyzico API anahtarları yapılandırılmamış');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/payment/iyzico/checkout/initialize`, {
        company_id: companyId,
        plan: selectedPlan,
        billing_cycle: billingCycle
      });

      if (response.data.success) {
        setCheckoutContent(response.data.checkoutFormContent);
        setStep('checkout');
        
        // Load iyzico checkout script
        setTimeout(() => {
          const container = document.getElementById('iyzico-checkout-container');
          if (container && response.data.checkoutFormContent) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = response.data.checkoutFormContent;
            container.appendChild(script);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Checkout initialization failed:', error);
      toast.error(error.response?.data?.detail || 'Ödeme başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  const price = PLANS[selectedPlan]?.[billingCycle] || 0;
  const planInfo = PLANS[selectedPlan];

  if (!iyzicoConfigured) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            iyzico Yapılandırması Gerekli
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              iyzico ile ödeme alabilmek için API anahtarlarının yapılandırılması gerekiyor.
              <br /><br />
              <strong>Yapılması gerekenler:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>iyzico merchant hesabı oluşturun: <a href="https://www.iyzico.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">www.iyzico.com</a></li>
                <li>Merchant panelinden API anahtarlarınızı alın</li>
                <li>Backend .env dosyasına aşağıdaki değişkenleri ekleyin:
                  <pre className="bg-slate-900 p-2 rounded mt-2 text-xs">
{`IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`}
                  </pre>
                </li>
                <li>Test için sandbox, canlı için production URL kullanın</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-400" />
            iyzico ile Ödeme
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {companyName} için abonelik ödemesi
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Abonelik Planı</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(PLANS).map(([key, plan]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-slate-700">
                      {plan.name} - ₺{plan.monthly}/ay
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <Label className="text-slate-300">Ödeme Periyodu</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="monthly" className="text-white hover:bg-slate-700">
                    Aylık - ₺{planInfo?.monthly}
                  </SelectItem>
                  <SelectItem value="yearly" className="text-white hover:bg-slate-700">
                    Yıllık - ₺{planInfo?.yearly} (%17 indirim)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Summary */}
            <Card className="bg-slate-700/50 border-slate-600">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-300">{planInfo?.name} Plan</span>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {planInfo?.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-600 mt-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Toplam</span>
                    <span className="text-2xl font-bold text-white">₺{price.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} className="border-slate-600">
                İptal
              </Button>
              <Button 
                onClick={initializeCheckout} 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ödemeye Geç
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'checkout' && (
          <div className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                Güvenli ödeme sayfası yükleniyor. Lütfen bekleyin...
              </AlertDescription>
            </Alert>
            
            <div 
              id="iyzico-checkout-container" 
              className="min-h-[400px] bg-white rounded-lg"
            >
              {!checkoutContent && (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')} className="border-slate-600">
                Geri Dön
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IyzicoPayment;
