/**
 * @cruzjs/core Image Processing
 *
 * Provider-agnostic image processing with resize, crop,
 * convert, and thumbnail operations.
 */

// Types & Interface
export type {
  ImageFormat,
  ResizeOptions,
  CropOptions,
  ConvertOptions,
  IImageProcessor,
} from './image.interface';
export { IMAGE_PROCESSOR } from './image.interface';

// No-Op Implementation
export { NoOpImageProcessor } from './no-op-image.processor';

// Service
export { ImageService } from './image.service';

// Module
export { ImageModule } from './image.module';
