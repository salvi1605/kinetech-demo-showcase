import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2 } from 'lucide-react';
import type { DailySummary } from '@/contexts/AppContext';

interface DailySummaryEditorProps {
  date: string;
  summary: DailySummary | null;
  isToday: boolean;
  canEdit: boolean;
  canDelete: boolean;
  prefillText?: string;
  onSave: (text: string) => void;
  onDelete?: () => void;
}

export const DailySummaryEditor = ({
  date,
  summary,
  isToday,
  canEdit,
  canDelete,
  prefillText,
  onSave,
  onDelete,
}: DailySummaryEditorProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(isToday && !summary);
  const [text, setText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    // Initialize text
    if (summary) {
      setText(summary.text);
    } else if (prefillText && isToday) {
      setText(prefillText);
    } else {
      setText('');
    }
  }, [summary, prefillText, isToday, date]);

  const handleSave = () => {
    if (text.length > 3000) return;
    onSave(text);
    setIsEditing(false);
    
    toast({
      title: 'Resumen guardado',
      description: 'El resumen clínico se ha guardado correctamente.',
    });
  };

  const handleCancel = () => {
    // Revert to saved or prefilled text
    if (summary) {
      setText(summary.text);
    } else if (prefillText) {
      setText(prefillText);
    } else {
      setText('');
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteDialog(false);
      
      toast({
        title: 'Resumen eliminado',
        description: 'El resumen clínico ha sido eliminado.',
      });
    }
  };

  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Read-only view for past days
  if (!isEditing && summary && !isToday) {
    return (
      <div className="mb-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-medium text-sm">Resumen clínico</h4>
            <p className="text-xs text-muted-foreground">
              Editado el {formatDate(summary.date)}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                aria-label="Editar resumen"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  aria-label="Eliminar resumen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{summary.text}</p>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar resumen?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El resumen clínico del día {formatDate(date)} será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Editing mode (today or admin editing past)
  if (isEditing && canEdit) {
    return (
      <div className="mb-4 p-4 border rounded-lg bg-card">
        <div className="mb-2">
          <h4 className="font-medium text-sm">Resumen clínico</h4>
          {!isToday && summary && (
            <p className="text-xs text-muted-foreground">
              Editando resumen del {formatDate(date)}
            </p>
          )}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 3000))}
          maxLength={3000}
          placeholder="Escribe el resumen clínico del día..."
          className="min-h-[120px] mb-2"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length}/3000</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={text.length > 3000}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Today without existing summary - show editor by default
  if (isToday && !summary && canEdit) {
    return (
      <div className="mb-4 p-4 border rounded-lg bg-card">
        <div className="mb-2">
          <h4 className="font-medium text-sm">Resumen clínico</h4>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 3000))}
          maxLength={3000}
          placeholder="Escribe el resumen clínico del día..."
          className="min-h-[120px] mb-2"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length}/3000</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={text.length > 3000}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
