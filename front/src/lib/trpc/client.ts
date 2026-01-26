'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../../back/src/trpc/index.js';

export const trpc = createTRPCReact<AppRouter>();
