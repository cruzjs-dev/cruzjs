import 'reflect-metadata';
import { createApiLoaderHandler, createApiActionHandler } from '@cruzjs/core/api';

export const loader = createApiLoaderHandler();
export const action = createApiActionHandler();
