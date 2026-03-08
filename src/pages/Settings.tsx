import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

const Settings = () => {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [engine, setEngine] = useState('gemini');
  const [resolution, setResolution] = useState('1080p');
  const [notifs, setNotifs] = useState({ genComplete: true, lowCredits: true, monthlySummary: false });
  const initials = (profile?.full_name ?? user?.email ?? '?').slice(0, 2).toUpperCase();

  const handleSave = () => {
    toast({ title: 'Settings saved' });
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl">Settings</h1>

      {/* Profile */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Profile</p>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-muted">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload photo
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} readOnly className="text-muted-foreground" />
          </div>
          <Button size="sm" onClick={handleSave}>Save changes</Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Preferences</p>
          <div className="space-y-2">
            <Label>Default AI Engine</Label>
            <ToggleGroup type="single" value={engine} onValueChange={v => v && setEngine(v)} variant="outline">
              <ToggleGroupItem value="gemini">Gemini</ToggleGroupItem>
              <ToggleGroupItem value="runway">Runway</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <Label>Default Resolution</Label>
            <ToggleGroup type="single" value={resolution} onValueChange={v => v && setResolution(v)} variant="outline">
              <ToggleGroupItem value="720p">720p</ToggleGroupItem>
              <ToggleGroupItem value="1080p">1080p</ToggleGroupItem>
              <ToggleGroupItem value="2k">2K</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button size="sm" onClick={handleSave}>Save preferences</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Notifications</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <Checkbox checked={notifs.genComplete} onCheckedChange={v => setNotifs(p => ({ ...p, genComplete: !!v }))} />
              <span className="text-sm">Generation complete email</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox checked={notifs.lowCredits} onCheckedChange={v => setNotifs(p => ({ ...p, lowCredits: !!v }))} />
              <span className="text-sm">Low credits alert</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox checked={notifs.monthlySummary} onCheckedChange={v => setNotifs(p => ({ ...p, monthlySummary: !!v }))} />
              <span className="text-sm">Monthly usage summary</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardContent className="p-6 space-y-2">
          <p className="font-medium text-destructive">Danger Zone</p>
          <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back.</p>
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-sm text-destructive hover:underline">Delete account</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete account?</DialogTitle>
                <DialogDescription>This action cannot be undone. All your projects, assets, and data will be permanently deleted.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive" onClick={() => toast({ title: 'Account deletion is not yet available', variant: 'destructive' })}>
                  Delete my account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
