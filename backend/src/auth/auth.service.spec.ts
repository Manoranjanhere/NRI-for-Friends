import { AuthService } from './auth.service';
import { FirebaseAdminService } from '../common/services/firebase-admin.service';

describe('AuthService', () => {
  const userRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    find: jest.fn(),
  } as any;
  const banQuery = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  const banRepository = { createQueryBuilder: jest.fn(() => banQuery) } as any;
  const resetRepository = { findOne: jest.fn(), save: jest.fn() } as any;
  const jwtService = { sign: jest.fn(() => 'jwt-token') } as any;
  const mailService = { sendNewUserAlertToAdmins: jest.fn() } as any;
  const firebaseAdmin = {
    verifyIdToken: jest.fn(),
  } as unknown as FirebaseAdminService;
  const auditService = {
    logLogin: jest.fn(),
    logAccount: jest.fn(),
    logReport: jest.fn(),
    logAdminAction: jest.fn(),
    logPayment: jest.fn(),
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    banQuery.getMany.mockResolvedValue([]);
    banQuery.getOne.mockResolvedValue(null);
    service = new AuthService(
      userRepository,
      banRepository,
      resetRepository,
      jwtService,
      mailService,
      firebaseAdmin,
      auditService,
    );
  });

  it('allows a phone number that is not banned', async () => {
    const result = await service.checkPhoneForAuth({ phone: '+919999999999' });

    expect(result).toEqual({ message: 'Phone number can receive OTP' });
    expect(banRepository.createQueryBuilder).toHaveBeenCalled();
  });

  it('rejects a banned phone number', async () => {
    banQuery.getMany.mockResolvedValue([{ value: '+91 99999 99999' }]);

    await expect(service.checkPhoneForAuth({ phone: '+919999999999' })).rejects.toThrow('banned');
  });

  it('verifies Firebase phone auth and returns JWT', async () => {
    (firebaseAdmin.verifyIdToken as jest.Mock).mockResolvedValue({
      phone_number: '+919999999999',
    });
    userRepository.findOne.mockResolvedValue(null);
    const newUser = { id: 'user-1', phone: '+919999999999', isActive: true, isBanned: false };
    userRepository.create.mockReturnValue(newUser);
    userRepository.save.mockResolvedValue(newUser);

    const result = await service.verifyPhoneAuth({ idToken: 'firebase-id-token' });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.isNewUser).toBe(true);
    expect(firebaseAdmin.verifyIdToken).toHaveBeenCalledWith('firebase-id-token');
  });
});
