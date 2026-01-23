'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X, FileText, File, Image } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MortgageDocumentFormData, MortgageDocumentCategory } from '@/types/finance';
import { MORTGAGE_DOCUMENT_CATEGORY_LABELS } from '@/types/finance';

interface MortgageDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MortgageDocumentFormData) => Promise<void>;
  mortgageId: string;
  userId: string;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-8 w-8 text-blue-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <File className="h-8 w-8 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function MortgageDocumentDialog({
  open,
  onOpenChange,
  onSave,
  mortgageId,
  userId,
}: MortgageDocumentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<MortgageDocumentFormData, 'file_path'>>({
    category: 'OUTROS',
    name: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setFile(null);
      setUploadedPath(null);
      setError(null);
      setFormData({
        category: 'OUTROS',
        name: '',
        notes: '',
      });
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type)) {
      setError('Tipo de arquivo nao suportado. Use PDF, imagens ou documentos Word.');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('Arquivo muito grande. Tamanho maximo: 10MB');
      return;
    }

    setFile(selectedFile);

    // Auto-fill name if empty
    if (!formData.name) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setFormData((prev) => ({ ...prev, name: nameWithoutExt }));
    }

    // Upload to Supabase Storage
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Generate unique file path
      const ext = fileToUpload.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${timestamp}.${ext}`;
      const filePath = `${userId}/${mortgageId}/${formData.category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mortgage-documents')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        throw uploadError;
      }

      setUploadedPath(filePath);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erro ao fazer upload do arquivo. Tente novamente.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    if (uploadedPath) {
      try {
        const supabase = createClient();
        await supabase.storage.from('mortgage-documents').remove([uploadedPath]);
      } catch (err) {
        console.error('Error removing file:', err);
      }
    }
    setFile(null);
    setUploadedPath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedPath) {
      setError('Selecione um arquivo');
      return;
    }

    if (!formData.name.trim()) {
      setError('Informe o nome do documento');
      return;
    }

    setLoading(true);

    try {
      const data: MortgageDocumentFormData = {
        ...formData,
        file_path: uploadedPath,
        file_size: file?.size,
        mime_type: file?.type,
      };
      await onSave(data);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Erro ao salvar documento');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Documento</DialogTitle>
          <DialogDescription>
            Faca upload de contratos, extratos e comprovantes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Arquivo <span className="text-red-500">*</span>
            </Label>

            {!file ? (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste o arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, imagens ou Word (max. 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  getFileIcon(file.type)
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                    {uploading && ' - Enviando...'}
                    {uploadedPath && ' - Enviado'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs font-medium">
                Categoria <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as MortgageDocumentCategory })
                }
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MORTGAGE_DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_year" className="text-xs font-medium">
                Ano de Referencia
              </Label>
              <Select
                value={formData.reference_year?.toString() || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, reference_year: value ? parseInt(value) : undefined })
                }
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Contrato de Financiamento"
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-medium">
              Observacoes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informacoes adicionais..."
              className="min-h-[60px] text-[13px]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading || !uploadedPath}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Documento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
