import { injectable, inject } from 'inversify';
import { ConfigService } from '../config/config.service';

/**
 * AWS X-Ray tracing service
 */
@injectable()
export class XRayService {
  private enabled = false;
  private initialized = false;

  constructor(@inject(ConfigService) private readonly configService: ConfigService) {}

  /**
   * Initialize AWS X-Ray tracing
   */
  initialize(): void {
    const xrayEnabled = this.configService.get<string>('AWS_XRAY_ENABLED');
    
    if (!xrayEnabled) {
      return;
    }

    if (this.initialized) {
      return;
    }

    try {
      // Only import X-Ray SDK if enabled
      const AWSXRay = require('aws-xray-sdk-core');
      
      // Configure X-Ray
      AWSXRay.setContextMissingStrategy('LOG_ERROR');
      
      this.enabled = true;
      this.initialized = true;
      
      console.log('[X-Ray] Tracing enabled');
    } catch (error) {
      console.error('[X-Ray] Failed to initialize:', error);
    }
  }

  /**
   * Check if X-Ray is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Capture function execution
   */
  async capture<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    try {
      const AWSXRay = require('aws-xray-sdk-core');
      return AWSXRay.captureAsyncFunc(name, (segment: { close: () => void }) => {
        return fn().finally(() => {
          if (segment) {
            segment.close();
          }
        });
      });
    } catch (error) {
      console.error('[X-Ray] Capture error:', error);
      return fn();
    }
  }

  /**
   * Add annotation to current segment
   */
  addAnnotation(key: string, value: string | number | boolean): void {
    if (!this.enabled) {
      return;
    }

    try {
      const AWSXRay = require('aws-xray-sdk-core');
      const segment = AWSXRay.getSegment();
      if (segment) {
        segment.addAnnotation(key, value);
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Add metadata to current segment
   */
  addMetadata(key: string, value: unknown): void {
    if (!this.enabled) {
      return;
    }

    try {
      const AWSXRay = require('aws-xray-sdk-core');
      const segment = AWSXRay.getSegment();
      if (segment) {
        segment.addMetadata(key, value);
      }
    } catch {
      // Ignore errors
    }
  }
}
