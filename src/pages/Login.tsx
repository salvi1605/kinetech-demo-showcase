import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login delay
    setTimeout(() => {
      // Mock user based on email
      const mockUser = {
        id: '1',
        name: email.split('@')[0],
        email,
        role: email.includes('admin') ? 'admin' as const : 
              email.includes('recep') ? 'recep' as const : 'kinesio' as const,
        clinicId: 'clinic-1',
      };

      dispatch({ type: 'LOGIN', payload: mockUser });
      
      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${mockUser.name}`,
      });

      navigate('/calendar');
      setIsLoading(false);
    }, 1000);
  };

  const quickLoginOptions = [
    { role: 'admin', email: 'admin@clinica.com', label: 'Admin' },
    { role: 'recep', email: 'recep@clinica.com', label: 'Recepcionista' },
    { role: 'kinesio', email: 'kinesio@clinica.com', label: 'Kinesiólogo' },
  ];

  const handleQuickLogin = (email: string) => {
    setEmail(email);
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kine-UI v2</h1>
          <p className="text-muted-foreground">Sistema de Gestión de Kinesiología</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Iniciar Sesión
            </CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            {/* Quick Login Options */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Acceso rápido para demo:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {quickLoginOptions.map((option) => (
                  <Button
                    key={option.role}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLogin(option.email)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Card className="bg-info/10 border-info/20">
          <CardContent className="pt-4">
            <p className="text-sm text-center text-info-foreground">
              <strong>Modo Demo:</strong> Usa cualquier email/contraseña para acceder.
              Los datos no se persisten y son solo para demostración.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};