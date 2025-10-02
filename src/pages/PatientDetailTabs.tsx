import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, Calendar, FileText, Plus, Clock, Heart, CreditCard, User, Stethoscope, FileCheck, Trash2, Eye, MoreHorizontal } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { EditPatientDialogV2 } from '@/components/patients/EditPatientDialogV2';

export const PatientDetailTabs = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useApp();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [editingData, setEditingData] = useState(false);
  const [editingClinical, setEditingClinical] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(false);

  const patient = state.patients.find(p => p.id === id);
  const patientAppointments = state.appointments.filter(apt => apt.patientId === id);

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
    const today = new Date();
    const birth = new Date(birthDate);
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

  const handleSave = (tabName: string) => {
    toast({
      title: "Datos guardados",
      description: `Los datos de ${tabName} se han actualizado correctamente.`,
    });
    
    // Reset editing state
    setEditingData(false);
    setEditingClinical(false);
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
        <Button onClick={() => setShowWizard(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Paciente
        </Button>
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
                {calculateAge(patient.birthDate)} años • ID: {patient.id}
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="resumen" className="gap-2">
            <FileText className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="datos" className="gap-2">
            <User className="h-4 w-4" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="clinico" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Clínico
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
                    .filter(apt => apt.status === 'scheduled')
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
                  <Input value={patient.name} disabled={!editingData} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={patient.email} disabled={!editingData} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={patient.phone} disabled={!editingData} />
                </div>
                <div>
                  <Label>Fecha de Nacimiento</Label>
                  <Input value={new Date(patient.birthDate).toLocaleDateString('es-ES')} disabled={!editingData} />
                </div>
                <div>
                  <Label>Documento/ID</Label>
                  <Input placeholder="DNI, Pasaporte..." disabled={!editingData} />
                </div>
                <div>
                  <Label>Género</Label>
                  <Select disabled={!editingData}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="no-binario">No binario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Dirección</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Línea 1</Label>
                    <Input placeholder="Calle y número" disabled={!editingData} />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input disabled={!editingData} />
                  </div>
                  <div>
                    <Label>Código Postal</Label>
                    <Input disabled={!editingData} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Contacto de Emergencia</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input placeholder="Nombre del contacto" disabled={!editingData} />
                  </div>
                  <div>
                    <Label>Relación</Label>
                    <Input placeholder="Familiar, amigo..." disabled={!editingData} />
                  </div>
                  <div className="col-span-2">
                    <Label>Teléfono</Label>
                    <Input placeholder="+54 11 1234-5678" disabled={!editingData} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clínico Tab */}
        <TabsContent value="clinico" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Información Clínica</CardTitle>
                {!isReadOnly('clinical') && (
                  <Button
                    variant={editingClinical ? "default" : "outline"}
                    onClick={() => editingClinical ? handleSave('información clínica') : setEditingClinical(true)}
                  >
                    {editingClinical ? 'Guardar' : 'Editar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Motivo Principal</Label>
                  <Textarea placeholder="Descripción del problema..." disabled={!editingClinical} />
                </div>
                <div>
                  <Label>Diagnóstico</Label>
                  <Input placeholder="Diagnóstico médico" disabled={!editingClinical} />
                </div>
                <div>
                  <Label>Médico Derivante</Label>
                  <Input placeholder="Nombre del médico" disabled={!editingClinical} />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Regiones Corporales Afectadas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {patient.conditions.map((condition, index) => (
                    <Badge key={index} variant="secondary">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Nivel de Dolor (0-10)</Label>
                <div className="px-4 py-6">
                  <Slider value={[5]} max={10} min={0} step={1} disabled={!editingClinical} />
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span>0 (Sin dolor)</span>
                    <span className="font-medium">5</span>
                    <span>10 (Dolor máximo)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Alergias</Label>
                  <Textarea placeholder="Alergias conocidas..." disabled={!editingClinical} />
                </div>
                <div>
                  <Label>Medicaciones</Label>
                  <Textarea placeholder="Medicamentos actuales..." disabled={!editingClinical} />
                </div>
                <div>
                  <Label>Comorbilidades</Label>
                  <Textarea placeholder="Otras condiciones..." disabled={!editingClinical} />
                </div>
                <div>
                  <Label>Objetivos de Tratamiento</Label>
                  <Textarea placeholder="Objetivos del paciente..." disabled={!editingClinical} />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">ROM y Mediciones</Label>
                <div className="mt-2 border rounded-lg p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Articulación</TableHead>
                        <TableHead>Movimiento</TableHead>
                        <TableHead>Inicial</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Objetivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Hombro</TableCell>
                        <TableCell>Flexión</TableCell>
                        <TableCell>120°</TableCell>
                        <TableCell>150°</TableCell>
                        <TableCell>180°</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Rodilla</TableCell>
                        <TableCell>Extensión</TableCell>
                        <TableCell>-10°</TableCell>
                        <TableCell>-5°</TableCell>
                        <TableCell>0°</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seguro Tab */}
        <TabsContent value="seguro" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Seguro y Facturación</CardTitle>
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
              <div>
                <h4 className="font-medium mb-3">Cobertura</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Obra Social/Seguro</Label>
                    <Input placeholder="Nombre de la obra social" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>Número de Póliza</Label>
                    <Input placeholder="Número de afiliado" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>Plan</Label>
                    <Input placeholder="Plan o tipo de cobertura" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>Copago</Label>
                    <Input type="number" placeholder="0.00" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>Sesiones Autorizadas</Label>
                    <Input type="number" placeholder="0" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>Sesiones Utilizadas</Label>
                    <Input type="number" placeholder="0" disabled={!editingInsurance} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Facturación</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nombre para Facturación</Label>
                    <Input placeholder="Nombre o razón social" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>CUIT/ID Fiscal</Label>
                    <Input placeholder="Número de identificación fiscal" disabled={!editingInsurance} />
                  </div>
                  <div>
                    <Label>Condición IVA</Label>
                    <Select disabled={!editingInsurance}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsable-inscripto">Responsable Inscripto</SelectItem>
                        <SelectItem value="monotributo">Monotributo</SelectItem>
                        <SelectItem value="exento">Exento</SelectItem>
                        <SelectItem value="consumidor-final">Consumidor Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección de Facturación</Label>
                    <Textarea placeholder="Dirección completa..." disabled={!editingInsurance} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Consentimientos</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox disabled={!editingInsurance} />
                    <Label className="font-normal">Consentimiento informado</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox disabled={!editingInsurance} />
                    <Label className="font-normal">Autorización SMS</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox disabled={!editingInsurance} />
                    <Label className="font-normal">Autorización WhatsApp</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox disabled={!editingInsurance} />
                    <Label className="font-normal">Autorización Email</Label>
                  </div>
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
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Subir Documento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                  <TableRow>
                    <TableCell className="font-medium">Estudios_Radiograficos.pdf</TableCell>
                    <TableCell>PDF</TableCell>
                    <TableCell>2.3 MB</TableCell>
                    <TableCell>15/08/2024</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background z-50">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Orden_Medica.jpg</TableCell>
                    <TableCell>Imagen</TableCell>
                    <TableCell>1.1 MB</TableCell>
                    <TableCell>10/08/2024</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background z-50">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
    </div>
  );
};