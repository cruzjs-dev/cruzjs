import { describe, it, expect, vi } from 'vitest';
import { N1Detector } from '../n1-detector';

describe('N1Detector', () => {
  it('does not warn for queries below threshold', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(3);

    detector.logQuery("SELECT * FROM users WHERE id = '1'", []);
    detector.logQuery("SELECT * FROM users WHERE id = '2'", []);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('warns when same query pattern hits threshold', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(3);

    detector.logQuery("SELECT * FROM users WHERE id = '1'", []);
    detector.logQuery("SELECT * FROM users WHERE id = '2'", []);
    detector.logQuery("SELECT * FROM users WHERE id = '3'", []);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('N+1 Warning');
    spy.mockRestore();
  });

  it('does not warn for distinct queries', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(3);

    detector.logQuery('SELECT * FROM users', []);
    detector.logQuery('SELECT * FROM posts', []);
    detector.logQuery('SELECT * FROM comments', []);
    detector.logQuery('SELECT * FROM tags', []);
    detector.logQuery('SELECT * FROM categories', []);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('reset clears all patterns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(3);

    detector.logQuery("SELECT * FROM users WHERE id = '1'", []);
    detector.logQuery("SELECT * FROM users WHERE id = '2'", []);
    detector.reset();
    detector.logQuery("SELECT * FROM users WHERE id = '3'", []);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('warns only once per pattern at threshold', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(3);

    for (let i = 0; i < 10; i++) {
      detector.logQuery(`SELECT * FROM users WHERE id = '${i}'`, []);
    }

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('normalizes numeric literals', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(3);

    detector.logQuery('SELECT * FROM users WHERE id = 1', []);
    detector.logQuery('SELECT * FROM users WHERE id = 2', []);
    detector.logQuery('SELECT * FROM users WHERE id = 3', []);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('N+1 Warning');
    spy.mockRestore();
  });

  it('tracks patterns via getPatterns', () => {
    const detector = new N1Detector();

    detector.logQuery("SELECT * FROM users WHERE id = '1'", []);
    detector.logQuery("SELECT * FROM users WHERE id = '2'", []);
    detector.logQuery('SELECT * FROM posts', []);

    const patterns = detector.getPatterns();
    expect(patterns.size).toBe(2);

    const userPattern = Array.from(patterns.values()).find((p) =>
      p.normalized.includes('users'),
    );
    expect(userPattern?.count).toBe(2);

    const postPattern = Array.from(patterns.values()).find((p) =>
      p.normalized.includes('posts'),
    );
    expect(postPattern?.count).toBe(1);
  });

  it('uses custom threshold', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detector = new N1Detector(5);

    for (let i = 0; i < 4; i++) {
      detector.logQuery(`SELECT * FROM users WHERE id = '${i}'`, []);
    }
    expect(spy).not.toHaveBeenCalled();

    detector.logQuery("SELECT * FROM users WHERE id = '5'", []);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('getPatterns returns a copy (not the internal map)', () => {
    const detector = new N1Detector();
    detector.logQuery('SELECT 1', []);

    const patterns = detector.getPatterns();
    patterns.clear();

    expect(detector.getPatterns().size).toBe(1);
  });
});
