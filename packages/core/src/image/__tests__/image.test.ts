/**
 * Image Processing Unit Tests
 *
 * Tests for NoOpImageProcessor contract and ImageService delegation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoOpImageProcessor } from '../no-op-image.processor';
import { ImageService } from '../image.service';
import type { IImageProcessor, ResizeOptions, CropOptions, ConvertOptions } from '../image.interface';

// ─── NoOpImageProcessor ─────────────────────────────────────────────────────

describe('NoOpImageProcessor', () => {
  let processor: NoOpImageProcessor;
  const sampleBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

  beforeEach(() => {
    processor = new NoOpImageProcessor();
  });

  it('should return input unchanged for resize', async () => {
    const result = await processor.resize(sampleBytes, { width: 100, height: 100 });
    expect(result).toBe(sampleBytes);
  });

  it('should return input unchanged for crop', async () => {
    const result = await processor.crop(sampleBytes, { x: 0, y: 0, width: 50, height: 50 });
    expect(result).toBe(sampleBytes);
  });

  it('should return input unchanged for convert', async () => {
    const result = await processor.convert(sampleBytes, { format: 'webp' });
    expect(result).toBe(sampleBytes);
  });

  it('should return input unchanged for thumbnail', async () => {
    const result = await processor.thumbnail(sampleBytes, 150);
    expect(result).toBe(sampleBytes);
  });

  it('should return input unchanged for thumbnail with default size', async () => {
    const result = await processor.thumbnail(sampleBytes);
    expect(result).toBe(sampleBytes);
  });

  it('should preserve byte content through all operations', async () => {
    const input = new Uint8Array([1, 2, 3, 4, 5]);

    const resized = await processor.resize(input, { width: 200 });
    const cropped = await processor.crop(input, { x: 10, y: 10, width: 100, height: 100 });
    const converted = await processor.convert(input, { format: 'jpeg', quality: 80 });
    const thumb = await processor.thumbnail(input, 64);

    expect(resized).toBe(input);
    expect(cropped).toBe(input);
    expect(converted).toBe(input);
    expect(thumb).toBe(input);
  });
});

// ─── ImageService ───────────────────────────────────────────────────────────

describe('ImageService', () => {
  let mockProcessor: IImageProcessor;
  let service: ImageService;
  const sampleBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const processedBytes = new Uint8Array([0x00, 0x01, 0x02]);

  beforeEach(() => {
    mockProcessor = {
      resize: vi.fn().mockResolvedValue(processedBytes),
      crop: vi.fn().mockResolvedValue(processedBytes),
      convert: vi.fn().mockResolvedValue(processedBytes),
      thumbnail: vi.fn().mockResolvedValue(processedBytes),
    };
    service = new ImageService(mockProcessor);
  });

  it('should delegate resize to processor', async () => {
    const options: ResizeOptions = { width: 800, height: 600, fit: 'cover' };
    const result = await service.resize(sampleBytes, options);

    expect(result).toBe(processedBytes);
    expect(mockProcessor.resize).toHaveBeenCalledWith(sampleBytes, options);
  });

  it('should delegate crop to processor', async () => {
    const options: CropOptions = { x: 10, y: 20, width: 200, height: 150 };
    const result = await service.crop(sampleBytes, options);

    expect(result).toBe(processedBytes);
    expect(mockProcessor.crop).toHaveBeenCalledWith(sampleBytes, options);
  });

  it('should delegate convert to processor', async () => {
    const options: ConvertOptions = { format: 'webp', quality: 85 };
    const result = await service.convert(sampleBytes, options);

    expect(result).toBe(processedBytes);
    expect(mockProcessor.convert).toHaveBeenCalledWith(sampleBytes, options);
  });

  it('should delegate thumbnail to processor', async () => {
    const result = await service.thumbnail(sampleBytes, 200);

    expect(result).toBe(processedBytes);
    expect(mockProcessor.thumbnail).toHaveBeenCalledWith(sampleBytes, 200);
  });

  it('should delegate thumbnail with default size', async () => {
    const result = await service.thumbnail(sampleBytes);

    expect(result).toBe(processedBytes);
    expect(mockProcessor.thumbnail).toHaveBeenCalledWith(sampleBytes, undefined);
  });

  it('should call resize then convert for resizeAndConvert', async () => {
    const resizedBytes = new Uint8Array([0x10, 0x20]);
    const convertedBytes = new Uint8Array([0x30, 0x40]);

    (mockProcessor.resize as ReturnType<typeof vi.fn>).mockResolvedValue(resizedBytes);
    (mockProcessor.convert as ReturnType<typeof vi.fn>).mockResolvedValue(convertedBytes);

    const result = await service.resizeAndConvert(sampleBytes, { width: 400 }, 'avif', 90);

    expect(result).toBe(convertedBytes);
    expect(mockProcessor.resize).toHaveBeenCalledWith(sampleBytes, { width: 400 });
    expect(mockProcessor.convert).toHaveBeenCalledWith(resizedBytes, { format: 'avif', quality: 90 });
  });

  it('should fall back to NoOpImageProcessor when no processor injected', async () => {
    const fallbackService = new ImageService();
    const input = new Uint8Array([1, 2, 3]);

    const result = await fallbackService.resize(input, { width: 100 });
    expect(result).toBe(input);
  });
});
