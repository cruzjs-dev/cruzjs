import 'reflect-metadata';
import { createTRPCLoaderHandler, createTRPCActionHandler } from '@cruzjs/core/trpc/trpc.route';

export const loader = createTRPCLoaderHandler();
export const action = createTRPCActionHandler();
