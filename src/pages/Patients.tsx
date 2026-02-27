import { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, Calendar, FileText, Edit, Trash2, Eye, Pencil, ScrollText, CalendarPlus, RotateCcw } from 'lucide-react';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { parseSmartDOB, parseLocalDate, formatDisplayDate } from '@/utils/dateUtils';
import { formatPatientFullName, matchesPatientSearch } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { useApp, Patient } from '@/contexts/AppContext';
import { usePatients } from '@/hooks/usePatients';
import { useInactivePatients } from '@/hooks/useInactivePatients';
import { supabase } from '@/integrations/supabase/client';
import { NewPatientDialogV2 } from '@/components/patients/NewPatientDialogV2';
import { EditPatientDialogV2 } from '@/components/patients/EditPatientDialogV2';
import { ClinicalHistoryDialog } from '@/components/patients/ClinicalHistoryDialog';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const Patients = () => {
  const { state, dispatch } = useApp();
  const { patients: dbPatients, loading: loadingPatients, refetch: refetchPatients } = usePatients(state.currentClinicId);
  const { patients: inactivePatients, loading: loadingInactive, refetch: refetchInactive } = useInactivePatients(state.currentClinicId);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [deletePatient, setDeletePatient] = useState<any>(null);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);
  const itemsPerPage = 10;

  const isAdmin = state.userRole === 'admin_clinic' || state.userRole === 'tenant_owner';

  // Sincronizar pacientes de BD con AppContext
  useEffect(() => {
    dispatch({ type: 'SET_PATIENTS', payload: dbPatients });
  }, [dbPatients, dispatch]);

  // Usar pacientes directamente del hook de BD para evitar parpadeo
  const patients = showInactive ? inactivePatients : dbPatients;
  const currentLoading = showInactive ? loadingInactive : loadingPatients;

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = matchesPatientSearch(patient, searchLower) ||
                         (patient.email && patient.email.toLowerCase().includes(searchLower)) ||
                         (patient.phone && patient.phone.toLowerCase().includes(searchLower)) ||
                         (patient.identificacion?.documentId && patient.identificacion.documentId.toLowerCase().includes(searchLower));
    
    const matchesFilter = filterCondition === 'all' || 
                         patient.conditions.some(condition => 
                           condition.toLowerCase().includes(filterCondition.toLowerCase())
                         );
    
    return matchesSearch && matchesFilter;
  });

  // Paginación
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  // Simular loading al filtrar
  const handleSearch = (value: string) => {
    setIsLoading(true);
    setSearchTerm(value);
    setCurrentPage(1);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleEdit = (patient: any) => {
    setEditingPatient(patient);
    setShowWizard(true);
  };

  const handleDelete = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', patientId);

      if (error) throw error;

      await refetchPatients();
      toast({
        title: "Paciente desactivado",
        description: "El paciente fue marcado como inactivo. Su información se conserva.",
      });
    } catch (err) {
      console.error('Error deactivating patient:', err);
      toast({
        title: "Error",
        description: "No se pudo desactivar el paciente.",
        variant: "destructive",
      });
    }
    setDeletePatient(null);
  };

  const handleReactivate = async (patient: any) => {
    const patientId = patient.id;
    const documentId = patient.identificacion?.documentId;
    setReactivating(patientId);

    try {
      // Check for DNI conflict
      if (documentId && documentId.trim() !== '') {
        const { data: conflict } = await supabase
          .from('patients')
          .select('id, full_name')
          .eq('clinic_id', state.currentClinicId!)
          .eq('document_id', documentId)
          .eq('is_deleted', false)
          .neq('id', patientId)
          .limit(1);

        if (conflict && conflict.length > 0) {
          toast({
            title: "No se puede reactivar",
            description: `Ya existe un paciente activo con el mismo documento: ${conflict[0].full_name}`,
            variant: "destructive",
          });
          setReactivating(null);
          return;
        }
      }

      const { error } = await supabase
        .from('patients')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', patientId);

      if (error) throw error;

      await Promise.all([refetchPatients(), refetchInactive()]);
      toast({
        title: "Paciente reactivado",
        description: `${patient.name} fue reactivado exitosamente.`,
      });
    } catch (err) {
      console.error('Error reactivating patient:', err);
      toast({
        title: "Error",
        description: "No se pudo reactivar el paciente.",
        variant: "destructive",
      });
    } finally {
      setReactivating(null);
    }
  };

  const handleNewPatient = () => {
    setEditingPatient(null);
    setShowWizard(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = parseSmartDOB(birthDate);
    if (!birth || isNaN(birth.getTime())) return null;
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const formatDeletedAt = (deletedAt?: string) => {
    if (!deletedAt) return '-';
    try {
      return new Date(deletedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Pacientes
          </h1>
          <p className="text-muted-foreground">
            Gestiona la información de los pacientes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle inactivos - solo admins */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label htmlFor="toggle-inactive" className="text-sm text-muted-foreground cursor-pointer select-none">
                Ver inactivos
              </label>
              <Switch
                id="toggle-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => {
                  setShowInactive(checked);
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
              />
              {showInactive && inactivePatients.length > 0 && (
                <Badge variant="secondary" className="ml-1">{inactivePatients.length}</Badge>
              )}
            </div>
          )}

          {state.userRole !== 'health_pro' && !showInactive && (
            <Button onClick={handleNewPatient} className="hidden lg:flex">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={showInactive ? "Buscar pacientes inactivos..." : "Buscar por nombre, email, teléfono o documento..."}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {!showInactive && (
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== INACTIVE VIEW ===== */}
      {showInactive ? (
        <>
          {/* Desktop Table - Inactive */}
          {!isMobile && (
            <Card>
              <CardContent className="p-0">
                {(loadingInactive || isLoading) ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>DNI/Documento</TableHead>
                        <TableHead>Desactivado el</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPatients.map((patient: any) => (
                        <TableRow key={patient.id}>
                          <TableCell className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {getInitials(formatPatientFullName(patient))}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{formatPatientFullName(patient)}</p>
                          </TableCell>
                          <TableCell>
                            {patient.identificacion?.documentId || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{formatDeletedAt(patient.deletedAt)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Inactivo</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 min-h-[44px]"
                                    disabled={reactivating === patient.id}
                                    onClick={() => handleReactivate(patient)}
                                  >
                                    <RotateCcw className={cn("h-4 w-4", reactivating === patient.id && "animate-spin")} />
                                    Reactivar
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reactivar paciente</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredPatients.length)} de {filteredPatients.length} pacientes inactivos
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="min-h-[44px]">Anterior</Button>
                      <span className="text-sm">{currentPage} de {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="min-h-[44px]">Siguiente</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mobile Cards - Inactive */}
          {isMobile && (
            <div className="space-y-4">
              {(loadingInactive || isLoading) ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))
              ) : (
                paginatedPatients.map((patient: any) => (
                  <Card key={patient.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {getInitials(formatPatientFullName(patient))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{formatPatientFullName(patient)}</p>
                            {patient.identificacion?.documentId && (
                              <p className="text-sm text-muted-foreground">DNI: {patient.identificacion.documentId}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                              <span className="text-xs text-muted-foreground">{formatDeletedAt(patient.deletedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 min-h-[44px]"
                          disabled={reactivating === patient.id}
                          onClick={() => handleReactivate(patient)}
                        >
                          <RotateCcw className={cn("h-4 w-4", reactivating === patient.id && "animate-spin")} />
                          Reactivar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="min-h-[44px]">Anterior</Button>
                    <Button variant="outline" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="min-h-[44px]">Siguiente</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state for inactive */}
          {!loadingInactive && filteredPatients.length === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">No hay pacientes inactivos</CardTitle>
                <CardDescription>
                  {searchTerm ? `No se encontraron pacientes inactivos con "${searchTerm}"` : 'Todos los pacientes están activos.'}
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* ===== ACTIVE VIEW (existing) ===== */}

          {/* Desktop Table View */}
          {!isMobile && (
            <Card>
              <CardContent className="p-0">
                {(loadingPatients || isLoading) ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        {state.userRole !== 'health_pro' && <TableHead>Contacto</TableHead>}
                        <TableHead>Edad</TableHead>
                        <TableHead>Última Visita</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPatients.map((patient) => (
                        <TableRow 
                          key={patient.id}
                          role={state.userRole !== 'health_pro' ? "button" : undefined}
                          tabIndex={state.userRole !== 'health_pro' ? 0 : undefined}
                          onClick={state.userRole !== 'health_pro' ? () => navigate(`/patients/${patient.id}`) : undefined}
                          onKeyDown={state.userRole !== 'health_pro' ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/patients/${patient.id}`);
                            }
                          } : undefined}
                          className={state.userRole !== 'health_pro' ? "hover:bg-muted cursor-pointer" : ""}
                        >
                          <TableCell className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(formatPatientFullName(patient))}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{formatPatientFullName(patient)}</p>
                              {state.userRole !== 'health_pro' && patient.identificacion?.documentId && (
                                <p className="text-sm text-muted-foreground">DNI/Pasaporte: {patient.identificacion.documentId}</p>
                              )}
                            </div>
                          </TableCell>
                          {state.userRole !== 'health_pro' && (
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3" />
                                  <a 
                                    href={`mailto:${patient.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="truncate max-w-[150px] hover:underline"
                                  >
                                    {patient.email}
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3" />
                                  <a 
                                    href={`tel:${patient.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline"
                                  >
                                    {patient.phone}
                                  </a>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            {calculateAge(patient.birthDate) !== null 
                              ? `${calculateAge(patient.birthDate)} años` 
                              : <span className="text-muted-foreground">-</span>
                            }
                          </TableCell>
                          <TableCell>
                            {patient.lastVisit ? (
                              <span className="text-sm">
                                {formatDisplayDate(parseLocalDate(patient.lastVisit))}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              <div className="flex items-center justify-end gap-1">
                                <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'health_pro']}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHistoryPatient(patient);
                                        }}
                                      >
                                        <ScrollText className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Historial del paciente</TooltipContent>
                                  </Tooltip>
                                </RoleGuard>
                                
                                <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/calendar?patientId=${patient.id}`);
                                        }}
                                      >
                                        <CalendarPlus className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Crear cita</TooltipContent>
                                  </Tooltip>
                                </RoleGuard>
                                <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(patient);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                </RoleGuard>
                                
                                <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletePatient(patient);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Desactivar</TooltipContent>
                                  </Tooltip>
                                </RoleGuard>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredPatients.length)} de {filteredPatients.length} pacientes
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="min-h-[44px]"
                      >
                        Anterior
                      </Button>
                      <span className="text-sm">{currentPage} de {totalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="min-h-[44px]"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mobile Cards View */}
          {isMobile && (
            <div className="space-y-4">
              {(loadingPatients || isLoading) ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))
              ) : (
                paginatedPatients.map((patient) => (
                  <Card 
                    key={patient.id} 
                    className={state.userRole !== 'health_pro' ? "hover:shadow-md transition-shadow cursor-pointer" : "hover:shadow-md transition-shadow"}
                    onClick={state.userRole !== 'health_pro' ? () => navigate(`/patients/${patient.id}`) : undefined}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(formatPatientFullName(patient))}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{formatPatientFullName(patient)}</CardTitle>
                            <CardDescription>
                              {state.userRole !== 'health_pro' && patient.identificacion?.documentId && (
                                <span className="block">DNI/Pasaporte: {patient.identificacion.documentId} • </span>
                              )}
                              {calculateAge(patient.birthDate)} años
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'health_pro']}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setHistoryPatient(patient)}
                            >
                              <ScrollText className="h-4 w-4" />
                            </Button>
                          </RoleGuard>
                          <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => navigate(`/calendar?patientId=${patient.id}`)}
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          </RoleGuard>
                          <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleEdit(patient)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </RoleGuard>
                          <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setDeletePatient(patient)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </RoleGuard>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Contact Info */}
                      {state.userRole !== 'health_pro' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <a 
                              href={`mailto:${patient.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="truncate hover:underline"
                            >
                              {patient.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a 
                              href={`tel:${patient.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:underline"
                            >
                              {patient.phone}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Last Visit / Next Appointment */}
                      <div className="space-y-2 text-sm">
                        {patient.lastVisit && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Última visita: {formatDisplayDate(parseLocalDate(patient.lastVisit))}</span>
                          </div>
                        )}
                        {patient.nextAppointment && (
                          <div className="flex items-center gap-2 text-accent">
                            <Calendar className="h-4 w-4" />
                            <span>Próxima cita: {formatDisplayDate(parseLocalDate(patient.nextAppointment))}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              
              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="min-h-[44px]"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="min-h-[44px]"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {!loadingPatients && filteredPatients.length === 0 && searchTerm && (
            <Card className="text-center p-8">
              <CardContent>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">No se encontraron pacientes</CardTitle>
                <CardDescription>
                  No hay pacientes que coincidan con tu búsqueda "{searchTerm}"
                </CardDescription>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {!loadingPatients && dbPatients.length === 0 && !searchTerm && (
            <Card className="text-center p-8">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">No hay pacientes registrados</CardTitle>
                <CardDescription className="mb-4">
                  Comienza agregando el primer paciente o activa el modo demo
                </CardDescription>
                <Button onClick={handleNewPatient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Paciente
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          {!loadingPatients && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{dbPatients.length}</p>
                  <p className="text-sm text-muted-foreground">Total Pacientes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">
                    {dbPatients.filter(p => p.nextAppointment).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Con Citas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {dbPatients.filter(p => p.lastVisit).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Visitados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-info">
                    {new Set(dbPatients.flatMap(p => p.conditions)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Condiciones</p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* FAB for Mobile */}
      {isMobile && state.userRole !== 'health_pro' && !showInactive && (
        <Button
          onClick={handleNewPatient}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Dialogs V2 */}
      {editingPatient ? (
        <EditPatientDialogV2 
          open={showWizard} 
          onOpenChange={setShowWizard}
          patient={editingPatient}
        />
      ) : (
        <NewPatientDialogV2 
          open={showWizard} 
          onOpenChange={setShowWizard}
          onSuccess={refetchPatients}
        />
      )}

      <AlertDialog open={!!deletePatient} onOpenChange={(open) => !open && setDeletePatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Desactivar paciente {deletePatient?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El paciente será marcado como inactivo y dejará de aparecer en las listas. Su información y historial clínico se conservan intactos. Solo un administrador puede realizar esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletePatient?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {historyPatient && (
        <ClinicalHistoryDialog 
          open={!!historyPatient}
          onOpenChange={(open) => !open && setHistoryPatient(null)}
          patient={historyPatient}
        />
      )}

      {/* FAB for mobile - Nuevo Paciente */}
      {state.userRole !== 'health_pro' && !showInactive && (
        <FloatingActionButton
          onClick={handleNewPatient}
          ariaLabel="Nuevo Paciente"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}
    </div>
  );
};
