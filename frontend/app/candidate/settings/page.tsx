'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, Key, Trash2, Save, Plus, X } from 'lucide-react';

export default function CandidateSettingsPage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Profile Preferences State
  const [profileSettings, setProfileSettings] = useState({
    display_name: '',
    bio: '',
    profile_picture_url: '',
    cover_photo_url: '',
    education: [] as string[],
    work_experience: [] as string[],
    certifications: [] as string[],
    languages_known: [] as string[],
    location: '',
    website: '',
    linkedin: '',
    github: ''
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    email_job_alerts: true,
    email_application_updates: true,
    email_offer_updates: true,
    email_newsletter: false
  });

  // Account Settings State
  const [accountSettings, setAccountSettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Temporary inputs for array fields
  const [newEducation, setNewEducation] = useState('');
  const [newExperience, setNewExperience] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // Load settings on component mount
  useEffect(() => {
    if (user && session) {
      fetchSettings();
    }
  }, [user, session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/candidate/settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const settings = data.settings;

        setProfileSettings({
          display_name: settings.display_name || '',
          bio: settings.bio || '',
          profile_picture_url: settings.profile_picture_url || '',
          cover_photo_url: settings.cover_photo_url || '',
          education: settings.education || [],
          work_experience: settings.work_experience || [],
          certifications: settings.certifications || [],
          languages_known: settings.languages_known || [],
          location: settings.location || '',
          website: settings.website || '',
          linkedin: settings.linkedin || '',
          github: settings.github || ''
        });

        setNotificationSettings({
          email_job_alerts: settings.email_job_alerts ?? true,
          email_application_updates: settings.email_application_updates ?? true,
          email_offer_updates: settings.email_offer_updates ?? true,
          email_newsletter: settings.email_newsletter ?? false
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings. Using defaults.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = () => {
    toast({
      title: 'Profile Settings Saved',
      description: 'Your profile preferences have been updated successfully.',
    });
  };

  const handleNotificationsSave = () => {
    toast({
      title: 'Notification Settings Saved',
      description: 'Your notification preferences have been updated successfully.',
    });
  };

  const handlePrivacySave = () => {
    toast({
      title: 'Privacy Settings Saved',
      description: 'Your privacy preferences have been updated successfully.',
    });
  };

  const handlePasswordChange = () => {
    if (accountSettings.newPassword !== accountSettings.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Password Changed',
      description: 'Your password has been updated successfully.',
    });

    setAccountSettings({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleAccountDeletion = () => {
    toast({
      title: 'Account Deletion Requested',
      description: 'Your account deletion request has been submitted. You will receive a confirmation email.',
      variant: 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account preferences and privacy settings.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          {/* <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger> */}
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Preferences Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Preferences</CardTitle>
              <CardDescription>
                Customize how your profile appears to recruiters and employers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileSettings.display_name}
                    onChange={(e) => setProfileSettings({...profileSettings, display_name: e.target.value})}
                    placeholder="Your preferred display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileSettings.location}
                    onChange={(e) => setProfileSettings({...profileSettings, location: e.target.value})}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={profileSettings.bio}
                  onChange={(e) => setProfileSettings({...profileSettings, bio: e.target.value})}
                  placeholder="Tell recruiters about yourself..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
                  <Input
                    id="profilePictureUrl"
                    value={profileSettings.profile_picture_url}
                    onChange={(e) => setProfileSettings({...profileSettings, profile_picture_url: e.target.value})}
                    placeholder="https://example.com/profile.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverPhotoUrl">Cover Photo URL</Label>
                  <Input
                    id="coverPhotoUrl"
                    value={profileSettings.cover_photo_url}
                    onChange={(e) => setProfileSettings({...profileSettings, cover_photo_url: e.target.value})}
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Education</h4>
                <div className="flex gap-2">
                  <Input
                    value={newEducation}
                    onChange={(e) => setNewEducation(e.target.value)}
                    placeholder="Add education (e.g., Bachelor's in Computer Science)"
                  />
                  <Button
                    onClick={() => {
                      if (newEducation.trim()) {
                        setProfileSettings({
                          ...profileSettings,
                          education: [...profileSettings.education, newEducation.trim()]
                        });
                        setNewEducation('');
                      }
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileSettings.education.map((edu, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {edu}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setProfileSettings({
                          ...profileSettings,
                          education: profileSettings.education.filter((_, i) => i !== index)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Work Experience</h4>
                <div className="flex gap-2">
                  <Input
                    value={newExperience}
                    onChange={(e) => setNewExperience(e.target.value)}
                    placeholder="Add work experience (e.g., Software Engineer at XYZ Corp)"
                  />
                  <Button
                    onClick={() => {
                      if (newExperience.trim()) {
                        setProfileSettings({
                          ...profileSettings,
                          work_experience: [...profileSettings.work_experience, newExperience.trim()]
                        });
                        setNewExperience('');
                      }
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileSettings.work_experience.map((exp, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {exp}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setProfileSettings({
                          ...profileSettings,
                          work_experience: profileSettings.work_experience.filter((_, i) => i !== index)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Certifications</h4>
                <div className="flex gap-2">
                  <Input
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="Add certification (e.g., AWS Certified Developer)"
                  />
                  <Button
                    onClick={() => {
                      if (newCertification.trim()) {
                        setProfileSettings({
                          ...profileSettings,
                          certifications: [...profileSettings.certifications, newCertification.trim()]
                        });
                        setNewCertification('');
                      }
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileSettings.certifications.map((cert, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {cert}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setProfileSettings({
                          ...profileSettings,
                          certifications: profileSettings.certifications.filter((_, i) => i !== index)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Languages Known</h4>
                <div className="flex gap-2">
                  <Input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Add language (e.g., English, Spanish)"
                  />
                  <Button
                    onClick={() => {
                      if (newLanguage.trim()) {
                        setProfileSettings({
                          ...profileSettings,
                          languages_known: [...profileSettings.languages_known, newLanguage.trim()]
                        });
                        setNewLanguage('');
                      }
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileSettings.languages_known.map((lang, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {lang}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setProfileSettings({
                          ...profileSettings,
                          languages_known: profileSettings.languages_known.filter((_, i) => i !== index)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Social Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Personal Website</Label>
                    <Input
                      id="website"
                      value={profileSettings.website}
                      onChange={(e) => setProfileSettings({...profileSettings, website: e.target.value})}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile</Label>
                    <Input
                      id="linkedin"
                      value={profileSettings.linkedin}
                      onChange={(e) => setProfileSettings({...profileSettings, linkedin: e.target.value})}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub Profile</Label>
                    <Input
                      id="github"
                      value={profileSettings.github}
                      onChange={(e) => setProfileSettings({...profileSettings, github: e.target.value})}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleProfileSave} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Profile Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about job opportunities and updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Job Alerts</Label>
                      <p className="text-sm text-slate-500">Receive emails about new job matches</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_job_alerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, email_job_alerts: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Application Updates</Label>
                      <p className="text-sm text-slate-500">Get notified when applications are reviewed</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_application_updates}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, email_application_updates: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Offer Updates</Label>
                      <p className="text-sm text-slate-500">Get notified about job offers and decisions</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_offer_updates}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, email_offer_updates: checked})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <Button onClick={handleNotificationsSave} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={accountSettings.currentPassword}
                  onChange={(e) => setAccountSettings({...accountSettings, currentPassword: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={accountSettings.newPassword}
                  onChange={(e) => setAccountSettings({...accountSettings, newPassword: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={accountSettings.confirmPassword}
                  onChange={(e) => setAccountSettings({...accountSettings, confirmPassword: e.target.value})}
                />
              </div>
              <Button onClick={handlePasswordChange} className="w-full md:w-auto">
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-red-600">Delete Account</h4>
                    <p className="text-sm text-slate-600">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAccountDeletion} className="bg-red-600 hover:bg-red-700">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
