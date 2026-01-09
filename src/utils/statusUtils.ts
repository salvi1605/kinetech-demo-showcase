/**
 * Utilidades centralizadas para manejo de estados de citas
 */

export type AppointmentStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled';

/**
 * Mapeo de códigos internos a etiquetas visibles
 */
export const statusLabel = (status: AppointmentStatus): string => {
  switch (status) {
    case 'scheduled':
      return 'Reservado';
    case 'completed':
      return 'Asistió';
    case 'no_show':
      return 'No Asistió';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

/**
 * Estilos para chips de estado
 */
export const statusChipStyle = (status: AppointmentStatus): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'no_show':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
