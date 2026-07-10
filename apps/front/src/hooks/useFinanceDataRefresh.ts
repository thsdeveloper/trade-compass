'use client';

import { useEffect, useRef } from 'react';
import { useFinanceDialogs } from '@/contexts/FinanceDialogContext';

/**
 * Hook para escutar mudancas de dados de financas e executar um callback.
 * Ignora a primeira renderizacao para evitar chamadas desnecessarias.
 *
 * @param callback Funcao a ser executada quando os dados mudarem
 */
export function useFinanceDataRefresh(callback: () => void) {
  const { dataVersion } = useFinanceDialogs();
  const isFirstRender = useRef(true);
  const callbackRef = useRef(callback);

  // Atualiza a referencia do callback para evitar dependencias stale
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Ignora a primeira renderizacao
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Executa o callback quando dataVersion mudar
    callbackRef.current();
  }, [dataVersion]);
}
