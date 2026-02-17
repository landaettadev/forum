'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface ReportButtonProps {
  targetUserId: string;
  targetUsername: string;
  size?: 'sm' | 'default' | 'lg';
}

export function ReportButton({ targetUserId, targetUsername, size = 'sm' }: ReportButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('reports');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para reportar');
      return;
    }

    if (!reason.trim()) {
      toast.error('Por favor describe el motivo del reporte');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        user_id: targetUserId,
        reason: reason.trim(),
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Reporte enviado correctamente');
      setOpen(false);
      setReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Error al enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size={size} className="text-red-500 hover:text-red-600">
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar usuario</DialogTitle>
          <DialogDescription>
            Estás reportando a <strong>{targetUsername}</strong>. Por favor describe el motivo de tu reporte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del reporte</Label>
            <Textarea
              id="reason"
              placeholder="Describe el comportamiento o contenido inapropiado..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !reason.trim()}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {submitting ? 'Enviando...' : 'Enviar reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
