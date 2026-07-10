'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { Plus, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { MortgageDocumentDialog } from '@/components/organisms/finance/MortgageDocumentDialog';
import { MortgageDocumentsTable } from '@/components/organisms/finance/MortgageDocumentsTable';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageDocument,
  MortgageDocumentFormData,
} from '@/types/finance';

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[300px] rounded-lg" />
    </div>
  );
}

export default function MortgageDocumentosPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mortgage, setMortgage] = useState<MortgageWithProgress | null>(null);
  const [documents, setDocuments] = useState<MortgageDocument[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.access_token || !id) return;

    setLoading(true);
    try {
      const [mortgageData, documentsData] = await Promise.all([
        financeApi.getMortgage(id, session.access_token),
        financeApi.getMortgageDocuments(id, session.access_token),
      ]);
      setMortgage(mortgageData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDocument = async (data: MortgageDocumentFormData) => {
    if (!session?.access_token || !id) return;
    await financeApi.createMortgageDocument(id, data, session.access_token);
    await fetchData();
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!session?.access_token || !id) return;
    await financeApi.deleteMortgageDocument(id, documentId, session.access_token);
    await fetchData();
  };

  if (loading) {
    return (
      <PageShell
        title="Documentos"
        description="Carregando..."
        backHref={`/financas/financiamentos/${id}`}
      >
        <PageSkeleton />
      </PageShell>
    );
  }

  if (!mortgage) {
    return (
      <PageShell
        title="Financiamento nao encontrado"
        description=""
        backHref="/financas/financiamentos"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">O financiamento solicitado nao foi encontrado.</p>
        </div>
      </PageShell>
    );
  }

  // Get user ID from session
  const userId = session?.user?.id || '';

  return (
    <PageShell
      title="Documentos"
      description={`${mortgage.institution_name} - ${mortgage.contract_number}`}
      backHref={`/financas/financiamentos/${id}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </div>
      }
    >
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum documento</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            Adicione contratos, extratos, comprovantes de pagamento e outros documentos
            relacionados ao seu financiamento.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Documento
          </Button>
        </div>
      ) : (
        <MortgageDocumentsTable documents={documents} onDelete={handleDeleteDocument} />
      )}

      <MortgageDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleCreateDocument}
        mortgageId={id}
        userId={userId}
      />
    </PageShell>
  );
}
