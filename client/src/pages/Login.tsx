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
import { Eye, EyeOff, Brain } from 'lucide-react';
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
  const headingRef = useRef(null);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);

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
      // Animate gradient panel heading
      gsap.fromTo(headingRef.current,
        { opacity: 0, y: 60, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.2 }
      );

      // Animate flowing lines
      linesRef.current.forEach((line, index) => {
        if (line) {
          gsap.fromTo(line,
            { scaleX: 0, opacity: 0 },
            { 
              scaleX: 1, 
              opacity: 0.3, 
              duration: 1.5, 
              delay: 0.5 + index * 0.2,
              ease: 'power2.out',
              transformOrigin: 'left center'
            }
          );
        }
      });

      // Animate form card
      gsap.fromTo(cardRef.current,
        { opacity: 0, x: 50, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 1, ease: 'power3.out', delay: 0.3 }
      );
      
      // Animate form fields
      gsap.fromTo(formRef.current?.children,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, delay: 0.7, ease: 'power2.out' }
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
    <div className="min-h-screen flex">
      {/* Left Side - Gradient Panel with Medical Images */}
      <div ref={logoRef} className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-white via-sky-100 to-cyan-200 relative overflow-hidden items-end justify-start p-12">
        {/* Doctor Image */}
        <div className="absolute inset-0">
          <img src="/src/assets/loginpage.png" alt="Medical Professional" className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-sky-100/50 to-cyan-200/60"></div>
        </div>

        {/* Animated flowing lines */}
        <div className="absolute inset-0 opacity-20">
          <div ref={el => linesRef.current[0] = el} className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent"></div>
          <div ref={el => linesRef.current[1] = el} className="absolute top-20 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          <div ref={el => linesRef.current[2] = el} className="absolute top-40 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
          <div ref={el => linesRef.current[3] = el} className="absolute top-60 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent"></div>
        </div>

        {/* Content - Bottom Left */}
        <div ref={headingRef} className="relative z-10 max-w-lg mb-8">
          <h1 className="text-[3.5rem] leading-[1.1] font-light text-slate-800 mb-6 tracking-wide" style={{ fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
            Your <span className="font-semibold text-sky-600">path</span> to <span className="font-semibold text-cyan-500">health</span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed font-light">
            Join NeuroLens and revolutionize neurological diagnostics with cutting-edge AI technology.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-black relative">
        <Card ref={cardRef} className="w-full max-w-md bg-transparent border-none shadow-none" style={{ fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <CardHeader className="space-y-4 mb-8">
            <CardTitle className="text-[2.5rem] font-light text-white text-center lg:text-left tracking-wide leading-tight">
              Login
            </CardTitle>
            <p className="text-slate-400 text-base text-center lg:text-left font-light">
              Enter your credentials to access your account
            </p>
          </CardHeader>
          
          <CardContent className="p-0">
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-semibold text-base">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="aimerpaix@gmail.com"
                  {...register('email')}
                  className={`h-14 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all text-base ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-semibold text-base">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`h-14 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all pr-12 text-base ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-4 py-2 hover:bg-slate-700/50 rounded-r-xl text-slate-400 hover:text-sky-400 transition-all"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-2 focus:ring-sky-400/30"
                />
                <Label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer font-medium">
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-base shadow-lg shadow-sky-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  'Login'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Not a member?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;