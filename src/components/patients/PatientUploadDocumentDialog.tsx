import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  patientId: string;
  clinicId: string;
}

export function PatientUploadDocumentDialog({ 
  open, 
  onClose, 
  onSave,
  patientId,
  clinicId 
}: PatientUploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleSave = async () => {
    if (!file || !patientId || !clinicId) return;

    setIsUploading(true);

    try {
      // Generate unique file path: clinic_id/patient_id/timestamp_filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${clinicId}/${patientId}/${timestamp}_${sanitizedFileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('patient-documents')
        .getPublicUrl(filePath);

      // Since bucket is private, we'll use the path as reference
      // and generate signed URLs when viewing
      const fileUrl = urlData.publicUrl || filePath;

      // Save metadata to patient_documents table
      const { data: docData, error: dbError } = await supabase
        .from('patient_documents')
        .insert({
          patient_id: patientId,
          clinic_id: clinicId,
          file_url: filePath, // Store path, not full URL
          file_type: file.type || 'application/octet-stream',
          description: file.name,
        })
        .select()
        .single();

      if (dbError) {
        // If DB insert fails, try to delete the uploaded file
        await supabase.storage.from('patient-documents').remove([filePath]);
        throw dbError;
      }

      const newDocument: PatientDocument = {
        id: docData.id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: filePath,
        createdAt: docData.uploaded_at || new Date().toISOString(),
      };

      onSave(newDocument);
      setFile(null);
      onClose();

      toast({
        title: 'Documento subido',
        description: `${file.name} se ha guardado correctamente.`,
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error al subir documento',
        description: error.message || 'No se pudo subir el archivo. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setFile(null);
    onClose();
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !file && !isUploading) {
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
          onClick={() => !isUploading && inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Área para arrastrar o seleccionar archivo"
          className={cn(
            "min-h-[280px] flex items-center justify-center text-center p-6 cursor-pointer select-none",
            "border-dashed border-2 rounded-lg transition-colors",
            isUploading && "cursor-not-allowed opacity-60",
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
              disabled={isUploading}
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
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
