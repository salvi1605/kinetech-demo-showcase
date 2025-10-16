import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PASTEL_COLORS } from '@/constants/pastelPalette';
import { cn } from '@/lib/utils';

interface PractitionerColorPickerModalProps {
  open: boolean;
  initialColor?: string;
  onClose: () => void;
  onConfirm: (hex: string) => void;
  usedColors?: string[];
}

export function PractitionerColorPickerModal({ 
  open, 
  initialColor, 
  onClose, 
  onConfirm, 
  usedColors = [] 
}: PractitionerColorPickerModalProps) {
  const [selected, setSelected] = useState<string>(initialColor || PASTEL_COLORS[0]);

  const isUsed = (hex: string) => 
    usedColors.map(c => c.toLowerCase()).includes(hex.toLowerCase());

  const handleConfirm = () => {
    if (!isUsed(selected)) {
      onConfirm(selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecciona un color para el profesional</DialogTitle>
          <DialogDescription>
            Cada profesional debe tener un color único
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-5 h-5 rounded-full border" 
            style={{ backgroundColor: selected }} 
          />
          <span className="text-sm text-muted-foreground">Vista previa</span>
          <span className="text-xs font-mono text-muted-foreground">{selected}</span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {PASTEL_COLORS.map(hex => {
            const taken = isUsed(hex);
            const isSelected = selected === hex;
            
            return (
              <button
                key={hex}
                type="button"
                onClick={() => !taken && setSelected(hex)}
                className={cn(
                  "w-12 h-12 sm:w-10 sm:h-10 rounded-md border transition-all",
                  isSelected && "ring-2 ring-blue-600 ring-offset-2",
                  taken ? "opacity-40 cursor-not-allowed" : "hover:scale-105 cursor-pointer"
                )}
                style={{ backgroundColor: hex }}
                aria-label={`Color ${hex}${taken ? ' (no disponible)' : ''}`}
                disabled={taken}
              />
            );
          })}
        </div>

        {isUsed(selected) && (
          <p className="text-sm text-destructive mt-3">
            Este color ya está asignado a otro profesional
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isUsed(selected)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
