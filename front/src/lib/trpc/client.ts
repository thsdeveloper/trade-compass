'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'back/trpc';

export const trpc = createTRPCReact<AppRouter>();
