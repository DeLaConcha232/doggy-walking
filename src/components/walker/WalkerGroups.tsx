import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Edit2, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

interface Group {
  id: string;
  name: string;
  color: string;
  description: string | null;
  memberCount: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface GroupMember {
  client_id: string;
}

const groupSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(50, 'Máximo 50 caracteres'),
  description: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
});

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

interface WalkerGroupsProps {
  walkerId: string;
}

const WalkerGroups = ({ walkerId }: WalkerGroupsProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLORS[0]
  });

  const loadData = useCallback(async () => {
    if (!walkerId) return;

    try {
      // Load groups with member count
      const { data: groupsData, error: groupsError } = await supabase
        .from('walker_groups')
        .select('id, name, color, description')
        .eq('walker_id', walkerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            ...group,
            memberCount: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);

      // Load affiliated clients
      const { data: affiliations, error: affError } = await supabase
        .from('affiliations')
        .select('user_id')
        .eq('admin_id', walkerId)
        .eq('is_active', true);

      if (affError) throw affError;

      if (affiliations && affiliations.length > 0) {
        const userIds = affiliations.map(a => a.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        setClients(profiles || []);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      toast.error('Error al cargar los grupos');
    } finally {
      setLoading(false);
    }
  }, [walkerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    try {
      const validated = groupSchema.parse(formData);
      setSaving(true);

      const { error } = await supabase
        .from('walker_groups')
        .insert({
          walker_id: walkerId,
          name: validated.name,
          description: validated.description || null,
          color: validated.color
        });

      if (error) throw error;

      toast.success('Grupo creado');
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', color: COLORS[0] });
      loadData();
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error('Error al crear el grupo');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;

    try {
      const validated = groupSchema.parse(formData);
      setSaving(true);

      const { error } = await supabase
        .from('walker_groups')
        .update({
          name: validated.name,
          description: validated.description || null,
          color: validated.color
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      toast.success('Grupo actualizado');
      setIsEditOpen(false);
      setSelectedGroup(null);
      loadData();
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error('Error al actualizar el grupo');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('¿Eliminar este grupo?')) return;

    try {
      const { error } = await supabase
        .from('walker_groups')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Grupo eliminado');
      loadData();
    } catch (err) {
      toast.error('Error al eliminar el grupo');
    }
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color
    });
    setIsEditOpen(true);
  };

  const openMembersDialog = async (group: Group) => {
    setSelectedGroup(group);
    
    // Load current members
    const { data: members } = await supabase
      .from('group_members')
      .select('client_id')
      .eq('group_id', group.id);

    setSelectedMembers((members || []).map((m: GroupMember) => m.client_id));
    setIsMembersOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!selectedGroup) return;
    setSaving(true);

    try {
      // Delete all existing members
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      // Insert new members
      if (selectedMembers.length > 0) {
        const { error } = await supabase
          .from('group_members')
          .insert(
            selectedMembers.map(clientId => ({
              group_id: selectedGroup.id,
              client_id: clientId
            }))
          );

        if (error) throw error;
      }

      toast.success('Miembros actualizados');
      setIsMembersOpen(false);
      setSelectedGroup(null);
      loadData();
    } catch (err) {
      toast.error('Error al guardar miembros');
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (clientId: string) => {
    setSelectedMembers(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Grupos de Clientes
            </CardTitle>
            <CardDescription>
              Organiza a tus clientes en grupos para paseos
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Grupo</DialogTitle>
                <DialogDescription>
                  Crea un grupo para organizar a tus clientes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del grupo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Paseo matutino"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción (opcional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del grupo..."
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tienes grupos creados</p>
            <p className="text-sm">Crea grupos para organizar tus paseos</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map(group => (
              <div
                key={group.id}
                className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium">{group.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {group.memberCount} {group.memberCount === 1 ? 'cliente' : 'clientes'}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openMembersDialog(group)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Miembros
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(group)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Grupo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del grupo</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Members Dialog */}
        <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Miembros del grupo: {selectedGroup?.name}</DialogTitle>
              <DialogDescription>
                Selecciona los clientes que pertenecen a este grupo
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {clients.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No tienes clientes afiliados
                </p>
              ) : (
                clients.map(client => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleMember(client.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(client.id)}
                      onCheckedChange={() => toggleMember(client.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMembersOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMembers} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default WalkerGroups;
