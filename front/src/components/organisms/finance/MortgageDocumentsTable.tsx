'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  FileText,
  File,
  Image,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MortgageDocument } from '@/types/finance';
import { MORTGAGE_DOCUMENT_CATEGORY_LABELS } from '@/types/finance';

interface MortgageDocumentsTableProps {
  documents: MortgageDocument[];
  onDelete: (documentId: string) => Promise<void>;
  pageSize?: number;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-4 w-4 text-gray-500" />;
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  return <File className="h-4 w-4 text-gray-500" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getCategoryBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    CONTRATO: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    MATRICULA: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
    EXTRATO: 'bg-green-100 text-green-700 hover:bg-green-100',
    COMPROVANTE: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
    SEGURO: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    ESCRITURA: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
    IPTU: 'bg-pink-100 text-pink-700 hover:bg-pink-100',
    OUTROS: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  };
  return colors[category] || colors.OUTROS;
}

export function MortgageDocumentsTable({
  documents,
  onDelete,
  pageSize = 10,
}: MortgageDocumentsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<MortgageDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.ceil(documents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDocuments = documents.slice(startIndex, startIndex + pageSize);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const handleView = async (doc: MortgageDocument) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('mortgage-documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error getting signed URL:', err);
      alert('Erro ao abrir documento');
    }
  };

  const handleDownload = async (doc: MortgageDocument) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('mortgage-documents')
        .download(doc.file_path);

      if (error) throw error;
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name + '.' + doc.file_path.split('.').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading:', err);
      alert('Erro ao baixar documento');
    }
  };

  const handleDeleteClick = (doc: MortgageDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      // Delete from storage
      const supabase = createClient();
      await supabase.storage.from('mortgage-documents').remove([documentToDelete.file_path]);

      // Delete from database
      await onDelete(documentToDelete.id);
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Erro ao excluir documento');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Tamanho</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum documento encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{getFileIcon(doc.mime_type)}</TableCell>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(doc.category)}>
                      {MORTGAGE_DOCUMENT_CATEGORY_LABELS[doc.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.reference_year || '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(doc)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          Baixar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(doc)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, documents.length)} de{' '}
            {documents.length} documentos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O documento &quot;{documentToDelete?.name}&quot; sera
              permanentemente excluido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
