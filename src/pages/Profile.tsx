import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  hospital_name: z.string().min(2, 'Hospital name is required'),
  hospital_location: z.string().min(2, 'Hospital location is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      hospital_name: profile?.hospital_name || '',
      hospital_location: profile?.hospital_location || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const { error } = await updateProfile(data);
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Profile updated successfully!',
        });
        setIsEditing(false);
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

  const handleCancel = () => {
    reset({
      name: profile?.name || '',
      email: profile?.email || '',
      hospital_name: profile?.hospital_name || '',
      hospital_location: profile?.hospital_location || '',
    });
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold text-foreground">
              Doctor Profile
            </CardTitle>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handleCancel} 
                  variant="outline" 
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      type="text"
                      {...register('name')}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                  ) : (
                    <p className="px-3 py-2 bg-muted rounded-md text-foreground">
                      {profile.name}
                    </p>
                  )}
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                  ) : (
                    <p className="px-3 py-2 bg-muted rounded-md text-foreground">
                      {profile.email}
                    </p>
                  )}
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospital_name">Hospital Name</Label>
                  {isEditing ? (
                    <Input
                      id="hospital_name"
                      type="text"
                      {...register('hospital_name')}
                      className={errors.hospital_name ? 'border-destructive' : ''}
                    />
                  ) : (
                    <p className="px-3 py-2 bg-muted rounded-md text-foreground">
                      {profile.hospital_name}
                    </p>
                  )}
                  {errors.hospital_name && (
                    <p className="text-sm text-destructive">{errors.hospital_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospital_location">Hospital Location</Label>
                  {isEditing ? (
                    <Input
                      id="hospital_location"
                      type="text"
                      {...register('hospital_location')}
                      className={errors.hospital_location ? 'border-destructive' : ''}
                    />
                  ) : (
                    <p className="px-3 py-2 bg-muted rounded-md text-foreground">
                      {profile.hospital_location}
                    </p>
                  )}
                  {errors.hospital_location && (
                    <p className="text-sm text-destructive">{errors.hospital_location.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account Created</Label>
                <p className="px-3 py-2 bg-muted rounded-md text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;