import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, Calendar, FileText, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useApp } from '@/contexts/AppContext';

export const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useApp();

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
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Detalle del Paciente</h1>
          <p className="text-muted-foreground">Información completa y historial</p>
        </div>
        <Button>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{patient.name}</CardTitle>
              <CardDescription>
                {calculateAge(patient.birthDate)} años • Paciente ID: {patient.id}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Nacimiento: {new Date(patient.birthDate).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Condiciones:</h4>
                <div className="flex flex-wrap gap-1">
                  {patient.conditions.map((condition, index) => (
                    <Badge key={index} variant="secondary">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>

              {(patient.lastVisit || patient.nextAppointment) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {patient.lastVisit && (
                      <div className="text-sm">
                        <span className="font-medium">Última visita: </span>
                        <span className="text-muted-foreground">
                          {new Date(patient.lastVisit).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    )}
                    {patient.nextAppointment && (
                      <div className="text-sm">
                        <span className="font-medium">Próxima cita: </span>
                        <span className="text-accent">
                          {new Date(patient.nextAppointment).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Appointments History */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Historial de Citas</CardTitle>
                  <CardDescription>
                    Todas las citas programadas y completadas
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Cita
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {patientAppointments.length > 0 ? (
                <div className="space-y-4">
                  {patientAppointments.map((appointment) => (
                    <Card key={appointment.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {new Date(appointment.date).toLocaleDateString('es-ES')}
                              </span>
                              <Badge variant={getStatusBadgeVariant(appointment.status)}>
                                {getStatusLabel(appointment.status)}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.startTime} - {appointment.endTime}</span>
                            </div>
                            
                            <div className="text-sm">
                              <span className="font-medium">Profesional: </span>
                              {getPractitionerName(appointment.practitionerId)}
                            </div>

                            <div className="text-sm">
                              <span className="font-medium">Tipo: </span>
                              <Badge variant="outline" className="text-xs">
                                {appointment.type === 'consultation' ? 'Consulta' :
                                 appointment.type === 'therapy' ? 'Terapia' : 'Seguimiento'}
                              </Badge>
                            </div>

                            {appointment.notes && (
                              <div className="text-sm">
                                <span className="font-medium">Notas: </span>
                                <span className="text-muted-foreground">{appointment.notes}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="mb-2">No hay citas registradas</CardTitle>
                  <CardDescription className="mb-4">
                    Este paciente aún no tiene citas programadas
                  </CardDescription>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Programar Primera Cita
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{patientAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Total Citas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-accent">
                  {patientAppointments.filter(a => a.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-warning">
                  {patientAppointments.filter(a => a.status === 'scheduled').length}
                </p>
                <p className="text-sm text-muted-foreground">Programadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">
                  {patientAppointments.filter(a => a.status === 'cancelled').length}
                </p>
                <p className="text-sm text-muted-foreground">Canceladas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};