import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function SuperAdminLogin() {
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
      // Check if user is superadmin
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === "superadmin") {
            toast.success("Hoş geldiniz, SuperAdmin!");
            navigate("/superadmin/dashboard");
          } else {
            toast.error("Bu panel sadece SuperAdmin kullanıcıları içindir");
            localStorage.removeItem("token");
            window.location.reload();
          }
        } catch (e) {
          toast.error("Token doğrulama hatası");
        }
      }
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <Card className="border-purple-500/20 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">SuperAdmin Panel</CardTitle>
            <CardDescription className="text-slate-400">
              Platform Yönetim Sistemi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">E-posta</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500"
                  data-testid="superadmin-email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Şifre</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 pr-10"
                    data-testid="superadmin-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
                data-testid="superadmin-login-btn"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Giriş Yap
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-center text-sm text-slate-500">
                Firma Paneli için{" "}
                <a href="/login" className="text-purple-400 hover:text-purple-300 underline">
                  buraya tıklayın
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
