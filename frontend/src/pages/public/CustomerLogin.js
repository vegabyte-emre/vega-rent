import getApiUrl from '../../config/api';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Car, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";


export function CustomerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${getApiUrl()}/api/auth/login`, {
        email,
        password,
      });
      const { access_token, user } = response.data;
      
      localStorage.setItem("customer_token", access_token);
      localStorage.setItem("customer_user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      
      toast.success("Giriş başarılı!");
      navigate("/hesabim");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl">FleetEase</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md px-4">
          <Card className="shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4">
                <Car className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Hoş Geldiniz</CardTitle>
              <CardDescription>
                Hesabınıza giriş yaparak rezervasyonlarınızı görüntüleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="customer-email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="customer-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-accent text-white font-medium"
                  disabled={loading}
                  data-testid="customer-login-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    "Giriş Yap"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Hesabınız yok mu? </span>
                <Link to="/musteri/kayit" className="text-accent hover:underline font-medium">
                  Kayıt Olun
                </Link>
              </div>

              <div className="mt-4 text-center">
                <Link to="/sifremi-unuttum" className="text-sm text-muted-foreground hover:text-foreground">
                  Şifremi Unuttum
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
