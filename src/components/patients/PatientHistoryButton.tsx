import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ClinicalHistoryDialog } from './ClinicalHistoryDialog';
import { Patient } from '@/contexts/AppContext';

interface PatientHistoryButtonProps {
  patient?: Patient | null;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const PatientHistoryButton = ({ 
  patient, 
  disabled = false,
  variant = 'outline',
  size = 'sm'
}: PatientHistoryButtonProps) => {
  const [open, setOpen] = useState(false);
  
  const canOpen = !!patient?.id && !disabled;
  
  const button = (
    <Button 
      variant={variant} 
      size={size} 
      onClick={() => canOpen && setOpen(true)} 
      disabled={!canOpen}
    >
      <ScrollText className="h-4 w-4 mr-2" />
      Historial del Paciente
    </Button>
  );

  return (
    <>
      {disabled && !patient?.id ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>Disponible luego de crear el paciente</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
      
      {patient?.id && (
        <ClinicalHistoryDialog 
          open={open} 
          onOpenChange={setOpen} 
          patient={patient} 
        />
      )}
    </>
  );
};
