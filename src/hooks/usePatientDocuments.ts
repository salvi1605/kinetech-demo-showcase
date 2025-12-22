import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PatientDocumentDB = {
  id: string;
  patient_id: string;
  clinic_id: string;
  file_url: string;
  file_type: string | null;
  description: string | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
};

export type PatientDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
};

export function usePatientDocuments(patientId: string | undefined, clinicId: string | undefined) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!patientId || !clinicId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Map DB documents to frontend format
      const mappedDocs: PatientDocument[] = (data || []).map((doc: PatientDocumentDB) => ({
        id: doc.id,
        name: doc.description || doc.file_url.split('/').pop() || 'Documento',
        size: 0, // Size is not stored in DB, could be added later
        type: doc.file_type || 'application/octet-stream',
        url: doc.file_url,
        createdAt: doc.uploaded_at || new Date().toISOString(),
      }));

      setDocuments(mappedDocs);
    } catch (error: any) {
      console.error('Error fetching patient documents:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId, clinicId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue with DB deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== documentId));

      toast({
        title: 'Documento eliminado',
        description: 'El documento ha sido eliminado correctamente.',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error al eliminar',
        description: error.message || 'No se pudo eliminar el documento.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  return {
    documents,
    loading,
    refetch: fetchDocuments,
    deleteDocument,
    getSignedUrl,
  };
}
