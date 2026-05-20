'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { createConnection } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  trigger?: React.ReactNode;
}

export function AddConnectionDialog({ trigger }: Props = {}) {
  const { addConnection } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '', db_type: 'postgres', host: 'localhost', port: '5432',
    username: 'postgres', password: '', db_name: ''
  });

  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setDbUrl(url);

    try {
      if (url.includes('://')) {
        const parsed = new URL(url);
        let scheme = parsed.protocol.replace(':', '');
        if (scheme === 'postgresql') scheme = 'postgres';

        if (['postgres', 'mysql'].includes(scheme)) {
          setFormData(prev => ({
            ...prev,
            db_type: scheme,
            host: parsed.hostname || prev.host,
            port: parsed.port || (scheme === 'postgres' ? '5432' : '3306'),
            username: parsed.username || prev.username,
            password: parsed.password || prev.password,
            db_name: parsed.pathname.replace('/', '') || prev.db_name
          }));
        }
      }
    } catch {
      // ignore invalid URLs while typing
    }
  };

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
      const response = (err as { response?: { data?: { detail?: unknown } } }).response;
      if (typeof response?.data?.detail === 'string') return response.data.detail;
    }
    return 'Unknown error';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createConnection(formData);
      if (res.status === 'success') {
        addConnection({
          id: res.connection_id, name: formData.name,
          db_type: formData.db_type, host: formData.host
        });
        setOpen(false);
      }
    } catch (err: unknown) {
      alert("Failed: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="mt-4 h-12 w-full justify-center gap-3 rounded-xl border-white/10 bg-transparent text-[#c2c6d7] hover:bg-white/[0.04] hover:text-[#e5e1e4]">
            <Plus size={16} /> Add Connection
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#1c1b1d] text-[#e5e1e4] sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Connect Database</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2 border-b border-border pb-4">
            <Label>Paste Connection URL (Optional)</Label>
            <Input
              value={dbUrl}
              onChange={handleUrlPaste}
              placeholder="postgres://user:pass@host:5432/dbname"
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Pasting a URL will automatically fill the fields below.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2"><Label>Name</Label><Input name="name" value={formData.name} onChange={handleChange} required placeholder="My DB" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={formData.db_type} onValueChange={(val) => setFormData({ ...formData, db_type: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="postgres">PostgreSQL</SelectItem><SelectItem value="mysql">MySQL</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Host</Label><Input name="host" value={formData.host} onChange={handleChange} required placeholder="localhost" /></div>
            <div className="space-y-2"><Label>Port</Label><Input name="port" value={formData.port} onChange={handleChange} required placeholder="5432" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>User</Label><Input name="username" value={formData.username} onChange={handleChange} required placeholder="postgres" /></div>
            <div className="space-y-2"><Label>DB Name</Label><Input name="db_name" value={formData.db_name} onChange={handleChange} required placeholder="sales" /></div>
          </div>
          <div className="space-y-2"><Label>Password</Label><Input name="password" value={formData.password} type="password" onChange={handleChange} required /></div>
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Connect
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
