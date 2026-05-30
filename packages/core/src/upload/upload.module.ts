/**
 * Upload Module
 *
 * Contains file upload services.
 */

import { Module } from '../di';
import { uploadTrpc } from './upload.trpc';
import { UploadService } from './upload.service';
import { ImageTransformService } from './image-transform.service';

@Module({
  providers: [UploadService, ImageTransformService],
  trpcRouters: {
    upload: uploadTrpc,
  },
})
export class UploadModule {}
