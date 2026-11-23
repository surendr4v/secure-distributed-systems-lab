import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SecurityService } from './security.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { RolesGuard } from './roles.guard';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

function contextFor(request: any, handler = jest.fn(), cls = jest.fn()): any {
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

describe('SecurityService', () => {
  const config = {
    getOrThrow: jest.fn(
      (key: string) =>
        ({
          JWT_PUBLIC_KEY: 'public-key',
          JWT_ISSUER: 'issuer',
          JWT_AUDIENCE: 'audience',
          INTERNAL_SHARED_SECRET: 'mesh-secret',
        })[key],
    ),
  } as unknown as ConfigService;

  let service: SecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityService(config);
  });

  it('verifies JWTs and normalizes roles and scopes', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      roles: ['payments:read'],
      scope: 'read write',
      iss: 'issuer',
      aud: 'audience',
    });

    expect(service.verifyJwt('valid-token')).toEqual(
      expect.objectContaining({
        sub: 'user-1',
        roles: ['payments:read'],
        scopes: ['read', 'write'],
      }),
    );
  });

  it('defaults roles and preserves an existing scopes array', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      iss: 'issuer',
      aud: 'audience',
      scopes: ['payments:read'],
    });

    const principal = service.verifyJwt('valid-token');
    expect(principal.roles).toEqual([]);
    expect(principal.scopes).toEqual(['payments:read']);
  });

  it('throws UnauthorizedException for invalid or expired JWTs', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('expired');
    });

    expect(() => service.verifyJwt('bad-token')).toThrow(UnauthorizedException);
  });

  it('validates the mesh secret strictly', () => {
    expect(service.validateServiceToken('mesh-secret')).toBe(true);
    expect(service.validateServiceToken('wrong')).toBe(false);
    expect(service.validateServiceToken()).toBe(false);
  });
});

describe('ZeroTrustGuard', () => {
  let reflector: any;
  let security: any;
  let guard: ZeroTrustGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    security = {
      verifyJwt: jest.fn(),
      validateServiceToken: jest.fn(),
    };
    guard = new ZeroTrustGuard(reflector, security);
  });

  it('allows public requests', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(contextFor({ headers: {} }))).toBe(true);
  });

  it('authenticates Bearer JWT credentials', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    security.verifyJwt.mockReturnValue({
      sub: 'user-1',
      roles: ['payments:read'],
    });
    const request: any = { headers: { authorization: 'Bearer token-1' } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.user.sub).toBe('user-1');
  });

  it('uses the first bearer value when authorization is an array', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    security.verifyJwt.mockReturnValue({ sub: 'user-1' });
    const request: any = { headers: { authorization: ['Bearer token-1'] } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('authenticates mesh service credentials', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    security.validateServiceToken.mockReturnValue(true);
    const request: any = {
      headers: { 'x-service-secret': 'secret', 'x-service-name': 'gateway' },
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.servicePrincipal).toEqual({ service: 'gateway' });
  });

  it('uses unknown as the service name fallback', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    security.validateServiceToken.mockReturnValue(true);
    const request: any = { headers: { 'x-service-secret': 'secret' } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.servicePrincipal).toEqual({ service: 'unknown' });
  });

  it('rejects missing credentials', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    security.validateServiceToken.mockReturnValue(false);

    expect(() => guard.canActivate(contextFor({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('RolesGuard', () => {
  let reflector: any;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector);
  });

  it('allows handlers without required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ user: {} }))).toBe(true);
  });

  it('allows trusted service principals to bypass role checks', () => {
    reflector.getAllAndOverride.mockReturnValue(['payments:write']);
    expect(
      guard.canActivate(
        contextFor({ servicePrincipal: { service: 'gateway' } }),
      ),
    ).toBe(true);
  });

  it('rejects users with missing roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['payments:read']);

    expect(() => guard.canActivate(contextFor({ user: {} }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects users lacking a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['payments:approve']);

    expect(() =>
      guard.canActivate(contextFor({ user: { roles: ['payments:read'] } })),
    ).toThrow(ForbiddenException);
  });

  it('allows a user with any required role', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'payments:read',
      'payments:approve',
    ]);

    expect(
      guard.canActivate(contextFor({ user: { roles: ['payments:approve'] } })),
    ).toBe(true);
  });
});
