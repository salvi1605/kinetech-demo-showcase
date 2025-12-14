import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, Calendar, FileText, Plus, Trash2, Eye, MoreHorizontal, User, CreditCard, FileCheck, Download } from 'lucide-react';
import { format } from 'date-fns';
import { parseSmartDOB, formatDisplayDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { EditPatientDialogV2 } from '@/components/patients/EditPatientDialogV2';
import { PatientUploadDocumentDialog } from '@/components/patients/PatientUploadDocumentDialog';
import type { PatientDocument } from '@/contexts/AppContext';

export const PatientDetailTabs = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [editingData, setEditingData] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [showUploadDocument, setShowUploadDocument] = useState(false);

  const patient = state.patients.find(p => p.id === id);
  // Filtrar citas del paciente, excluyendo continuaciones
  const patientAppointments = state.appointments.filter(apt => apt.patientId === id && !apt.isContinuation);

  if (!patient) {
    return (
      <div className="p-6">
        <Card className="text-center p-8">
          <CardContent>
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Paciente no encontrado</CardTitle>
            <CardDescription className="mb-4">
              El paciente con ID {id} no existe en el sistema
            </CardDescription>
            <Button onClick={() => navigate('/patients')}>
              Volver a Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const getPractitionerName = (practitionerId: string) => {
    const practitioner = state.practitioners.find(p => p.id === practitionerId);
    return practitioner?.name || 'Profesional no encontrado';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Reservado';
      case 'completed': return 'Asistió';
      case 'cancelled': return 'No Asistió';
      default: return status;
    }
  };

  const handleFieldUpdate = (field: string, value: any) => {
    if (!patient) return;
    
    dispatch({
      type: 'UPDATE_PATIENT',
      payload: {
        id: patient.id,
        updates: { [field]: value }
      }
    });
  };

  const handleSave = (tabName: string) => {
    toast({
      title: "Datos guardados",
      description: `Los datos de ${tabName} se han actualizado correctamente.`,
    });
    
    // Reset editing state
    setEditingData(false);
    setEditingInsurance(false);
  };

  const canEdit = (section: string) => {
    if (state.userRole === 'admin') return true;
    if (state.userRole === 'kinesio') {
      return section === 'clinical';
    }
    if (state.userRole === 'recep') {
      return section === 'data' || section === 'insurance';
    }
    return false;
  };

  const isReadOnly = (section: string) => {
    return !canEdit(section);
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Ficha del Paciente</h1>
          <p className="text-muted-foreground">Información completa y gestión</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowWizard(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Paciente
          </Button>
        </div>
      </div>

      {/* Patient Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{patient.name}</CardTitle>
              <CardDescription className="text-base">
                {calculateAge(patient.birthDate) !== null 
                  ? `${calculateAge(patient.birthDate)} años` 
                  : <span className="text-muted-foreground">-</span>
                } • DNI: {patient.identificacion?.documentId || <span className="text-muted-foreground">Sin documento</span>}
              </CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {patient.email}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {patient.phone}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="resumen" className="gap-2">
            <FileText className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="datos" className="gap-2">
            <User className="h-4 w-4" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="seguro" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Seguro
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <Calendar className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Resumen Tab */}
        <TabsContent value="resumen" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{patientAppointments.length}</p>
                    <p className="text-sm text-muted-foreground">Total Sesiones</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">
                      {patientAppointments.filter(a => a.status === 'cancelled').length}
                    </p>
                    <p className="text-sm text-muted-foreground">No-shows</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent">
                      {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('es-ES') : '-'}
                    </p>
                    <p className="text-sm text-muted-foreground">Última Visita</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-warning">
                      {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString('es-ES') : '-'}
                    </p>
                    <p className="text-sm text-muted-foreground">Próxima Cita</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Próximos Turnos */}
            <Card>
              <CardHeader>
                <CardTitle>Próximos Turnos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientAppointments
                    .filter(apt => apt.status === 'scheduled' && !apt.isContinuation)
                    .slice(0, 3)
                    .map(apt => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(apt.date).toLocaleDateString('es-ES')}</p>
                          <p className="text-sm text-muted-foreground">{apt.startTime}</p>
                        </div>
                        <Badge variant="outline">{getPractitionerName(apt.practitionerId)}</Badge>
                      </div>
                    ))}
                  {patientAppointments.filter(apt => apt.status === 'scheduled').length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No hay turnos programados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Datos Tab */}
        <TabsContent value="datos" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Datos Personales</CardTitle>
                {!isReadOnly('data') && (
                  <Button
                    variant={editingData ? "default" : "outline"}
                    onClick={() => editingData ? handleSave('datos personales') : setEditingData(true)}
                  >
                    {editingData ? 'Guardar' : 'Editar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Completo</Label>
                  <Input
                    value={patient.identificacion?.fullName || patient.name}
                    onChange={(e) => handleFieldUpdate('identificacion', { ...patient.identificacion, fullName: e.target.value })}
                    disabled={!editingData}
                  />
                </div>
                <div>
                  <Label>Nombre Preferido</Label>
                  <Input
                    value={patient.identificacion?.preferredName || ''}
                    onChange={(e) => handleFieldUpdate('identificacion', { ...patient.identificacion, preferredName: e.target.value })}
                    placeholder="Como prefiere que lo llamen"
                    disabled={!editingData}
                  />
                </div>
                <div>
                  <Label>DNI/Pasaporte</Label>
                  <Input
                    value={patient.identificacion?.documentId || ''}
                    onChange={(e) => handleFieldUpdate('identificacion', { ...patient.identificacion, documentId: e.target.value })}
                    placeholder="DNI, Pasaporte..."
                    disabled={!editingData}
                  />
                </div>
                <div>
                  <Label>Fecha de Nacimiento</Label>
                  <Input
                    value={patient.identificacion?.dateOfBirth || patient.birthDate || ''}
                    onChange={(e) => handleFieldUpdate('identificacion', { ...patient.identificacion, dateOfBirth: e.target.value })}
                    disabled={!editingData}
                  />
                </div>
                <div>
                  <Label>Teléfono Móvil</Label>
                  <Input
                    value={patient.identificacion?.mobilePhone || patient.phone}
                    onChange={(e) => handleFieldUpdate('identificacion', { ...patient.identificacion, mobilePhone: e.target.value })}
                    disabled={!editingData}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    value={patient.identificacion?.email || patient.email}
                    onChange={(e) => handleFieldUpdate('identificacion', { ...patient.identificacion, email: e.target.value })}
                    disabled={!editingData}
                  />
                </div>
              </div>
              
              <Separator />

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Contacto de Emergencia</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={patient.emergencia?.contactName || ''}
                      onChange={(e) => handleFieldUpdate('emergencia', { ...patient.emergencia, contactName: e.target.value })}
                      placeholder="Nombre del contacto"
                      disabled={!editingData}
                    />
                  </div>
                  <div>
                    <Label>Relación</Label>
                    <Input
                      value={patient.emergencia?.relationship || ''}
                      onChange={(e) => handleFieldUpdate('emergencia', { ...patient.emergencia, relationship: e.target.value })}
                      placeholder="Familiar, amigo..."
                      disabled={!editingData}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={patient.emergencia?.emergencyPhone || ''}
                      onChange={(e) => handleFieldUpdate('emergencia', { ...patient.emergencia, emergencyPhone: e.target.value })}
                      placeholder="+54 11 1234-5678"
                      disabled={!editingData}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h4 className="font-medium mb-3">Autorizaciones de Contacto</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="auth-whatsapp-tabs"
                      checked={patient.seguro?.contactAuth?.whatsapp || false}
                      onCheckedChange={(checked) =>
                        handleFieldUpdate('seguro', {
                          ...patient.seguro,
                          contactAuth: { ...patient.seguro?.contactAuth, whatsapp: !!checked }
                        })
                      }
                      disabled={!editingData}
                    />
                    <label htmlFor="auth-whatsapp-tabs" className="font-normal text-sm">WhatsApp</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="auth-email-tabs"
                      checked={patient.seguro?.contactAuth?.email || false}
                      onCheckedChange={(checked) =>
                        handleFieldUpdate('seguro', {
                          ...patient.seguro,
                          contactAuth: { ...patient.seguro?.contactAuth, email: !!checked }
                        })
                      }
                      disabled={!editingData}
                    />
                    <label htmlFor="auth-email-tabs" className="font-normal text-sm">E-mail</label>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <Label>Preferencia de Recordatorio</Label>
                <Select
                  value={patient.seguro?.reminderPref || 'none'}
                  onValueChange={(value) => handleFieldUpdate('seguro', { ...patient.seguro, reminderPref: value })}
                  disabled={!editingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 horas antes</SelectItem>
                    <SelectItem value="none">Sin recordatorios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seguro Tab */}
        <TabsContent value="seguro" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Información de Seguro</CardTitle>
                {!isReadOnly('insurance') && (
                  <Button
                    variant={editingInsurance ? "default" : "outline"}
                    onClick={() => editingInsurance ? handleSave('información de seguro') : setEditingInsurance(true)}
                  >
                    {editingInsurance ? 'Guardar' : 'Editar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Obra Social/Seguro</Label>
                  <Select
                    value={patient.seguro?.obraSocial || ''}
                    onValueChange={(value) => handleFieldUpdate('seguro', { ...patient.seguro, obraSocial: value })}
                    disabled={!editingInsurance}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar obra social" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="osde">OSDE</SelectItem>
                      <SelectItem value="luis_pasteur">Luis Pasteur</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número de Afiliado</Label>
                  <Input
                    value={patient.seguro?.numeroAfiliado || ''}
                    onChange={(e) => handleFieldUpdate('seguro', { ...patient.seguro, numeroAfiliado: e.target.value })}
                    placeholder="Número de afiliado"
                    disabled={!editingInsurance}
                  />
                </div>
                <div>
                  <Label>Sesiones Autorizadas</Label>
                  <Input
                    type="number"
                    value={patient.seguro?.sesionesAutorizadas || ''}
                    onChange={(e) => handleFieldUpdate('seguro', { ...patient.seguro, sesionesAutorizadas: Number(e.target.value) })}
                    placeholder="0"
                    disabled={!editingInsurance}
                  />
                </div>
                <div>
                  <Label>Copago</Label>
                  <Input
                    type="number"
                    value={patient.seguro?.copago || ''}
                    onChange={(e) => handleFieldUpdate('seguro', { ...patient.seguro, copago: Number(e.target.value) })}
                    placeholder="0.00"
                    disabled={!editingInsurance}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial Tab */}
        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Eventos</CardTitle>
              <CardDescription>Registro cronológico de todas las actividades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patientAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Sesión de {appointment.type === 'consultation' ? 'Consulta' : 
                                      appointment.type === 'therapy' ? 'Terapia' : 'Seguimiento'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.date).toLocaleDateString('es-ES')} • {appointment.startTime}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getPractitionerName(appointment.practitionerId)}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {patientAppointments.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay eventos en el historial</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos Tab */}
        <TabsContent value="documentos" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documentos</CardTitle>
                  <CardDescription>Archivos y documentación del paciente</CardDescription>
                </div>
                <Button onClick={() => setShowUploadDocument(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Subir Documento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {patient.documents && patient.documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[300px]">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{doc.type || 'Archivo'}</TableCell>
                        <TableCell>{(doc.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                        <TableCell>
                          {format(new Date(doc.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.url, '_blank')}
                              aria-label="Ver documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.url;
                                link.download = doc.name;
                                link.click();
                              }}
                              aria-label="Descargar documento"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`¿Eliminar "${doc.name}"?`)) {
                                  const updatedDocs = patient.documents?.filter(d => d.id !== doc.id) || [];
                                  dispatch({
                                    type: 'UPDATE_PATIENT',
                                    payload: {
                                      id: patient.id,
                                      updates: { documents: updatedDocs }
                                    }
                                  });
                                  URL.revokeObjectURL(doc.url);
                                  toast({
                                    title: 'Documento eliminado',
                                    description: `${doc.name} ha sido eliminado.`,
                                  });
                                }
                              }}
                              className="text-destructive hover:text-destructive"
                              aria-label="Eliminar documento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos subidos</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Usa el botón "Subir Documento" para agregar archivos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wizard Dialog V2 */}
      <EditPatientDialogV2
        open={showWizard}
        onOpenChange={setShowWizard}
        patient={patient}
      />

      {/* Upload Document Dialog */}
      <PatientUploadDocumentDialog
        open={showUploadDocument}
        onClose={() => setShowUploadDocument(false)}
        onSave={(doc: PatientDocument) => {
          dispatch({
            type: 'UPDATE_PATIENT',
            payload: {
              id: patient.id,
              updates: {
                documents: [...(patient.documents || []), doc]
              }
            }
          });
          toast({
            title: 'Documento subido',
            description: `${doc.name} ha sido agregado correctamente.`,
          });
        }}
      />
    </div>
  );
};