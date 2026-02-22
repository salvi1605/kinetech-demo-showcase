import { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, Calendar, FileText, Edit, Trash2, Eye, Pencil, ScrollText } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';
import { useApp, Patient } from '@/contexts/AppContext';
import { usePatients } from '@/hooks/usePatients';
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
  const itemsPerPage = 10;

  // Sincronizar pacientes de BD con AppContext
  useEffect(() => {
    dispatch({ type: 'SET_PATIENTS', payload: dbPatients });
  }, [dbPatients, dispatch]);

  // Usar pacientes directamente del hook de BD para evitar parpadeo
  const patients = dbPatients;

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

  const handleDelete = (patientId: string) => {
    dispatch({ type: 'DELETE_PATIENT', payload: patientId });
    toast({
      title: "Paciente eliminado",
      description: "El paciente ha sido eliminado del sistema.",
      variant: "destructive",
    });
    setDeletePatient(null);
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

        {state.userRole !== 'health_pro' && (
          <div className="flex items-center gap-2">
            <Button onClick={handleNewPatient} className={cn("hidden lg:flex")}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, teléfono o documento..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

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
                                      handleEdit(patient);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
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
                                      setDeletePatient(patient);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
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
                          onClick={() => handleEdit(patient)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </RoleGuard>
                      <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}>
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
      {!loadingPatients && patients.length === 0 && !searchTerm && (
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
              <p className="text-2xl font-bold text-primary">{patients.length}</p>
              <p className="text-sm text-muted-foreground">Total Pacientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">
                {patients.filter(p => p.nextAppointment).length}
              </p>
              <p className="text-sm text-muted-foreground">Con Citas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">
                {patients.filter(p => p.lastVisit).length}
              </p>
              <p className="text-sm text-muted-foreground">Visitados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-info">
                {new Set(patients.flatMap(p => p.conditions)).size}
              </p>
              <p className="text-sm text-muted-foreground">Condiciones</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAB for Mobile */}
      {isMobile && state.userRole !== 'health_pro' && (
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
              ¿Eliminar paciente {deletePatient?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletePatient?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Eliminar
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
    </div>
  );
};