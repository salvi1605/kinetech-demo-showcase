import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';

export type PatientDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
};

interface PatientUploadDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (doc: PatientDocument) => void;
}

export function PatientUploadDocumentDialog({ open, onClose, onSave }: PatientUploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSave = () => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newDocument: PatientDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      url,
      createdAt: new Date().toISOString(),
    };

    onSave(newDocument);
    setFile(null);
    onClose();
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !file) {
      inputRef.current?.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir documento del paciente</DialogTitle>
          <DialogDescription>
            Puedes arrastrar tu archivo o seleccionarlo desde tu computadora.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Área para arrastrar o seleccionar archivo"
          className={cn(
            "min-h-[280px] flex items-center justify-center text-center p-6 cursor-pointer select-none",
            "border-dashed border-2 rounded-lg transition-colors",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/30 hover:bg-muted/50"
          )}
        >
          <div>
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">Arrastra tu archivo aquí</p>
            <p className="text-sm text-muted-foreground">o haz clic para seleccionarlo</p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Seleccionar archivo"
            />
          </div>
        </div>

        {file && (
          <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div className="flex-1 min-w-0 text-sm mr-3">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB · {file.type || 'archivo'}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              aria-label="Quitar archivo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!file}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
