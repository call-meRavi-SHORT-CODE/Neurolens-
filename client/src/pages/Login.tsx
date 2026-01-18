import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Brain, Activity, Zap } from 'lucide-react';
import { gsap } from 'gsap';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const formRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
      );
      
      gsap.fromTo(logoRef.current,
        { opacity: 0, scale: 0.8, rotation: -10 },
        { opacity: 1, scale: 1, rotation: 0, duration: 1, delay: 0.3, ease: 'elastic.out(1, 0.5)' }
      );
      
      gsap.fromTo(formRef.current?.children,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, delay: 0.5, ease: 'power2.out' }
      );
    });

    return () => ctx.revert();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        // Handle specific error cases
        let errorMessage = error.message;
        
        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address. Check your inbox for the confirmation link.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Welcome back!',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* NeuroLens Background Text */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
        <span className="text-[200px] font-black text-white/5 whitespace-nowrap select-none" style={{ letterSpacing: '0.2em' }}>
          NeuroLens
        </span>
      </div>

      <Card ref={cardRef} className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-3xl relative z-10 overflow-hidden">
        <CardHeader className="text-center border-b border-slate-700/50 pb-8 pt-8 relative">
          <div ref={logoRef} className="flex flex-col items-center gap-4 mb-4 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Brain className="w-9 h-9 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              NeuroLens
            </CardTitle>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Sign in to your doctor account
          </p>
        </CardHeader>
        <CardContent className="pt-8 pb-8 px-8">
          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@hospital.com"
                {...register('email')}
                className={`h-12 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/30 focus:bg-slate-800 transition-all shadow-lg ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`h-12 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 focus:bg-slate-800 transition-all pr-12 shadow-lg ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-4 py-2 hover:bg-slate-700/50 rounded-r-xl text-slate-400 hover:text-cyan-400 transition-all"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white font-bold shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Sign In
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900/90 px-4 text-slate-500">New to NeuroLens?</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              <Link
                to="/signup"
                className="font-semibold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text hover:from-cyan-300 hover:to-blue-300 transition-all"
              >
                Create your account →
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;