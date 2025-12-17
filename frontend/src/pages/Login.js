import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Car, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      toast.success("Giriş başarılı!");
      navigate("/dashboard");
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.85)), url('https://images.unsplash.com/photo-1639693805920-605b38f3d0d5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG1vZGVybiUyMGNhciUyMHNpbGhvdWV0dGUlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8Ymx1ZXwxNzY1OTg5MzQ0fDA&ixlib=rb-4.1.0&q=85')`
      }}
    >
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center shadow-lg">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div className="text-white">
            <h1 className="text-3xl font-bold tracking-tight">FleetEase</h1>
            <p className="text-sm text-slate-400">Kurumsal Araç Kiralama</p>
          </div>
        </div>

        <Card className="glass-card shadow-2xl border-white/10">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Hoş Geldiniz</CardTitle>
            <CardDescription>
              Hesabınıza giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email"
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
                    data-testid="login-password"
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
                data-testid="login-submit"
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
              <Link to="/register" className="text-accent hover:underline font-medium" data-testid="register-link">
                Kayıt Olun
              </Link>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center mb-2">Demo Hesapları</p>
              <div className="text-xs space-y-1">
                <p><span className="font-medium">SuperAdmin:</span> admin@fleetease.com / admin123</p>
                <p><span className="font-medium">Firma Admin:</span> firma@fleetease.com / firma123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
