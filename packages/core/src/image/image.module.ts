/**
 * Image Module
 *
 * Registers the ImageService and NoOpImageProcessor into the DI container.
 * Platform-specific adapters override the IMAGE_PROCESSOR token
 * when a RuntimeAdapter provides one.
 */

import { Module } from '../di';
import { ImageService } from './image.service';
import { NoOpImageProcessor } from './no-op-image.processor';
import { IMAGE_PROCESSOR } from './image.interface';

@Module({
  providers: [
    ImageService,
    {
      provide: IMAGE_PROCESSOR,
      useFactory: () => new NoOpImageProcessor(),
    },
  ],
})
export class ImageModule {}
