import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  members: string[];
}

interface SelectiveWalkStartProps {
  walkerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartWalk: (selectedClients: string[], groupId: string | null, notes: string) => Promise<void>;
}

const SelectiveWalkStart = ({ walkerId, open, onOpenChange, onStartWalk }: SelectiveWalkStartProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'all' | 'group' | 'manual'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!walkerId) return;
    setLoading(true);

    try {
      // Load affiliated clients
      const { data: affiliations } = await supabase
        .from('affiliations')
        .select('user_id')
        .eq('admin_id', walkerId)
        .eq('is_active', true);

      if (affiliations && affiliations.length > 0) {
        const userIds = affiliations.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        setClients(profiles || []);
        // Default: select all clients
        setSelectedClients(userIds);
      }

      // Load groups with members
      const { data: groupsData } = await supabase
        .from('walker_groups')
        .select('id, name, color')
        .eq('walker_id', walkerId)
        .eq('is_active', true);

      if (groupsData) {
        const groupsWithMembers = await Promise.all(
          groupsData.map(async (group) => {
            const { data: members } = await supabase
              .from('group_members')
              .select('client_id')
              .eq('group_id', group.id);
            
            return {
              ...group,
              members: (members || []).map(m => m.client_id)
            };
          })
        );
        setGroups(groupsWithMembers);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [walkerId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedClients(group.members);
    }
  };

  const handleModeChange = (mode: 'all' | 'group' | 'manual') => {
    setSelectionMode(mode);
    if (mode === 'all') {
      setSelectedClients(clients.map(c => c.id));
      setSelectedGroup('');
    } else if (mode === 'manual') {
      setSelectedGroup('');
    }
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleStart = async () => {
    if (selectedClients.length === 0) {
      toast.error('Selecciona al menos un cliente');
      return;
    }

    setStarting(true);
    try {
      await onStartWalk(
        selectedClients,
        selectionMode === 'group' ? selectedGroup : null,
        notes
      );
      onOpenChange(false);
      // Reset form
      setSelectionMode('all');
      setSelectedGroup('');
      setNotes('');
    } catch (err) {
      console.error('Error starting walk:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Iniciar Paseo
          </DialogTitle>
          <DialogDescription>
            Selecciona qué clientes podrán ver tu ubicación
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tienes clientes afiliados</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>¿Quién verá este paseo?</Label>
              <RadioGroup
                value={selectionMode}
                onValueChange={(v) => handleModeChange(v as 'all' | 'group' | 'manual')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer">
                    <span className="font-medium">Todos mis clientes</span>
                    <p className="text-sm text-muted-foreground">
                      {clients.length} cliente{clients.length !== 1 ? 's' : ''}
                    </p>
                  </Label>
                </div>

                {groups.length > 0 && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50">
                    <RadioGroupItem value="group" id="group" />
                    <Label htmlFor="group" className="flex-1 cursor-pointer">
                      <span className="font-medium">Usar un grupo</span>
                      <p className="text-sm text-muted-foreground">
                        Selecciona un grupo predefinido
                      </p>
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="flex-1 cursor-pointer">
                    <span className="font-medium">Seleccionar manualmente</span>
                    <p className="text-sm text-muted-foreground">
                      Elige clientes específicos
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {selectionMode === 'group' && groups.length > 0 && (
              <div className="space-y-2">
                <Label>Selecciona el grupo</Label>
                <Select value={selectedGroup} onValueChange={handleGroupChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name} ({group.members.length})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectionMode === 'manual' && (
              <div className="space-y-2">
                <Label>Clientes ({selectedClients.length} seleccionados)</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2">
                  {clients.map(client => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleClient(client.id)}
                    >
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas del paseo (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Paseo por el parque central..."
                maxLength={500}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleStart}
            disabled={starting || selectedClients.length === 0}
          >
            {starting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {starting ? 'Iniciando...' : 'Iniciar Paseo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectiveWalkStart;
