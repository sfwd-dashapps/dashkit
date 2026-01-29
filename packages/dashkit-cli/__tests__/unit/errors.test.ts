import { describe, it, expect } from 'vitest';
import { DashKitError, ERRORS } from '../../src/utils/errors';

describe('DashKitError', () => {
  it('should create error with message, code, and exit code', () => {
    const error = new DashKitError('Test error', 'TEST_ERROR', 2);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.exitCode).toBe(2);
    expect(error.name).toBe('DashKitError');
  });

  it('should default exit code to 1', () => {
    const error = new DashKitError('Test error', 'TEST_ERROR');
    expect(error.exitCode).toBe(1);
  });
});

describe('ERRORS', () => {
  it('should define NOT_GIT_REPO error', () => {
    expect(ERRORS.NOT_GIT_REPO).toBeInstanceOf(DashKitError);
    expect(ERRORS.NOT_GIT_REPO.code).toBe('NOT_GIT_REPO');
  });

  it('should define ALREADY_INSTALLED error', () => {
    expect(ERRORS.ALREADY_INSTALLED).toBeInstanceOf(DashKitError);
    expect(ERRORS.ALREADY_INSTALLED.code).toBe('ALREADY_INSTALLED');
  });

  it('should define NOT_INSTALLED error', () => {
    expect(ERRORS.NOT_INSTALLED).toBeInstanceOf(DashKitError);
    expect(ERRORS.NOT_INSTALLED.code).toBe('NOT_INSTALLED');
  });

  it('should define PERMISSION_DENIED error', () => {
    expect(ERRORS.PERMISSION_DENIED).toBeInstanceOf(DashKitError);
    expect(ERRORS.PERMISSION_DENIED.code).toBe('PERMISSION_DENIED');
  });

  it('should define NODE_VERSION error', () => {
    expect(ERRORS.NODE_VERSION).toBeInstanceOf(DashKitError);
    expect(ERRORS.NODE_VERSION.code).toBe('NODE_VERSION');
  });

  it('should define INVALID_CONFIG error', () => {
    expect(ERRORS.INVALID_CONFIG).toBeInstanceOf(DashKitError);
    expect(ERRORS.INVALID_CONFIG.code).toBe('INVALID_CONFIG');
  });
});
