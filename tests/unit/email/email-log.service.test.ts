import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailLogService } from '@cruzjs/core/email/email-log.service';

describe('EmailLogService', () => {
  let emailLogService: EmailLogService;
  let mockDb: any;
  let mockInsertChain: any;
  let mockUpdateChain: any;
  let mockSelectChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Drizzle query builder chains
    mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    mockUpdateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    // Mock Drizzle database
    mockDb = {
      insert: vi.fn().mockReturnValue(mockInsertChain),
      update: vi.fn().mockReturnValue(mockUpdateChain),
      select: vi.fn().mockReturnValue(mockSelectChain),
    };

    emailLogService = new EmailLogService(mockDb);
  });

  describe('createLog', () => {
    it('should create email log entry with all fields', async () => {
      const input = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        cc: 'cc@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        metadata: { name: 'John' },
      };

      const mockLog = {
        id: 'log-123',
        ...input,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockInsertChain.returning.mockResolvedValue([mockLog]);

      const result = await emailLogService.createLog(input);

      expect(result).toEqual(mockLog);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        to: input.to,
        from: input.from,
        cc: input.cc,
        subject: input.subject,
        template: input.template,
        status: 'PENDING',
        metadata: JSON.stringify(input.metadata),
      });
    });

    it('should create email log entry with minimal fields', async () => {
      const input = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
      };

      const mockLog = {
        id: 'log-123',
        to: input.to,
        from: null,
        cc: null,
        subject: input.subject,
        template: null,
        status: 'PENDING',
        metadata: null,
        createdAt: new Date(),
      };

      mockInsertChain.returning.mockResolvedValue([mockLog]);

      const result = await emailLogService.createLog(input);

      expect(result).toEqual(mockLog);
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        to: input.to,
        from: null,
        cc: null,
        subject: input.subject,
        template: null,
        status: 'PENDING',
        metadata: null,
      });
    });
  });

  describe('updateLog', () => {
    it('should update log with SENT status and message ID', async () => {
      const id = 'log-123';
      const input = {
        status: 'SENT' as const,
        messageId: 'msg-123',
      };

      const mockUpdatedLog = {
        id,
        status: 'SENT',
        messageId: 'msg-123',
        sentAt: new Date(),
      };

      mockUpdateChain.returning.mockResolvedValue([mockUpdatedLog]);

      const result = await emailLogService.updateLog(id, input);

      expect(result).toEqual(mockUpdatedLog);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockUpdateChain.set).toHaveBeenCalledWith({
        status: 'SENT',
        messageId: 'msg-123',
        error: null,
        sentAt: expect.any(String),
      });
    });

    it('should update log with FAILED status and error', async () => {
      const id = 'log-123';
      const input = {
        status: 'FAILED' as const,
        error: 'SES Error',
      };

      const mockUpdatedLog = {
        id,
        status: 'FAILED',
        error: 'SES Error',
        sentAt: null,
      };

      mockUpdateChain.returning.mockResolvedValue([mockUpdatedLog]);

      const result = await emailLogService.updateLog(id, input);

      expect(result).toEqual(mockUpdatedLog);
      expect(mockUpdateChain.set).toHaveBeenCalledWith({
        status: 'FAILED',
        messageId: null,
        error: 'SES Error',
        sentAt: null,
      });
    });

    it('should return null if log not found', async () => {
      const id = 'log-123';
      const input = {
        status: 'SENT' as const,
        messageId: 'msg-123',
      };

      mockUpdateChain.returning.mockResolvedValue([]);

      const result = await emailLogService.updateLog(id, input);

      expect(result).toBeNull();
    });
  });

  describe('getLog', () => {
    it('should get email log by ID', async () => {
      const id = 'log-123';
      const mockLog = {
        id,
        to: 'recipient@example.com',
        subject: 'Test Subject',
        status: 'SENT',
      };

      mockSelectChain.limit.mockResolvedValue([mockLog]);

      const result = await emailLogService.getLog(id);

      expect(result).toEqual(mockLog);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelectChain.from).toHaveBeenCalledTimes(1);
      expect(mockSelectChain.where).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(1);
    });

    it('should return null if log not found', async () => {
      const id = 'log-123';

      mockSelectChain.limit.mockResolvedValue([]);

      const result = await emailLogService.getLog(id);

      expect(result).toBeNull();
    });
  });

  describe('getLogsByRecipient', () => {
    it('should get email logs for recipient ordered by date', async () => {
      const to = 'recipient@example.com';
      const limit = 10;
      const mockLogs = [
        {
          id: 'log-2',
          to,
          subject: 'Subject 2',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'log-1',
          to,
          subject: 'Subject 1',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockSelectChain.limit.mockResolvedValue(mockLogs);

      const result = await emailLogService.getLogsByRecipient(to, limit);

      expect(result).toEqual(mockLogs);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelectChain.from).toHaveBeenCalledTimes(1);
      expect(mockSelectChain.where).toHaveBeenCalled();
      expect(mockSelectChain.orderBy).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(limit);
    });

    it('should use default limit of 50 if not provided', async () => {
      const to = 'recipient@example.com';
      const mockLogs = [];

      mockSelectChain.limit.mockResolvedValue(mockLogs);

      await emailLogService.getLogsByRecipient(to);

      expect(mockSelectChain.limit).toHaveBeenCalledWith(50);
    });
  });
});

