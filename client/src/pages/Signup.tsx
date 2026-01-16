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
import { Eye, EyeOff, Brain, User, Mail, Building2, MapPin, Lock } from 'lucide-react';
import { gsap } from 'gsap';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  hospital_name: z.string().min(2, 'Hospital name is required'),
  hospital_location: z.string().min(2, 'Hospital location is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const formRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
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
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.08, delay: 0.5, ease: 'power2.out' }
      );
    });

    return () => ctx.revert();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, {
        name: data.name,
        hospital_name: data.hospital_name,
        hospital_location: data.hospital_location,
      });
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Account created successfully! Please check your email to verify your account.',
        });
        navigate('/login');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 px-4 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* NeuroLens Background Text */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
        <span className="text-[200px] font-black text-white/5 whitespace-nowrap select-none" style={{ letterSpacing: '0.2em' }}>
          NeuroLens
        </span>
      </div>

      <Card ref={cardRef} className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-3xl relative z-10 overflow-hidden">
        <CardHeader className="text-center border-b border-slate-700/50 pb-6 pt-6 relative">
          <div ref={logoRef} className="flex flex-col items-center gap-3 mb-3 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-600 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              NeuroLens
            </CardTitle>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Create your doctor account
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-6 px-8">
          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-purple-400" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Dr. John Doe"
                {...register('name')}
                className={`h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-3 focus:ring-purple-500/30 focus:bg-slate-800 transition-all shadow-lg ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {errors.name && (
                <p className="text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@hospital.com"
                {...register('email')}
                className={`h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/30 focus:bg-slate-800 transition-all shadow-lg ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospital_name" className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Hospital Name
              </Label>
              <Input
                id="hospital_name"
                type="text"
                placeholder="General Hospital"
                {...register('hospital_name')}
                className={`h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:bg-slate-800 transition-all shadow-lg ${errors.hospital_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {errors.hospital_name && (
                <p className="text-sm text-red-400">{errors.hospital_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospital_location" className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Hospital Location
              </Label>
              <Input
                id="hospital_location"
                type="text"
                placeholder="New York, NY"
                {...register('hospital_location')}
                className={`h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all shadow-lg ${errors.hospital_location ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {errors.hospital_location && (
                <p className="text-sm text-red-400">{errors.hospital_location.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                <Lock className="w-3.5 h-3.5 text-orange-400" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-3 focus:ring-orange-500/30 focus:bg-slate-800 transition-all pr-11 shadow-lg ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-700/50 rounded-r-xl text-slate-400 hover:text-orange-400 transition-all"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                <Lock className="w-3.5 h-3.5 text-pink-400" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                  className={`h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm border-slate-600 text-white placeholder:text-slate-500 focus:border-pink-500 focus:ring-3 focus:ring-pink-500/30 focus:bg-slate-800 transition-all pr-11 shadow-lg ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-700/50 rounded-r-xl text-slate-400 hover:text-pink-400 transition-all"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600 text-white font-bold shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Create Account
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900/90 px-4 text-slate-500">Already registered?</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              <Link
                to="/login"
                className="font-semibold text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text hover:from-purple-300 hover:to-cyan-300 transition-all"
              >
                Sign in to your account →
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;