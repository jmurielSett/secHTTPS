import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INotificationRepository } from '../../../../../src/domain/repositories/INotificationRepository';
import { GetNotificationsUseCase } from '../../../../../src/domain/usecases/notifications/GetNotificationsUseCase';
import { Notification, NotificationResult } from '../../../../../src/types/notification';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para GetNotificationsUseCase
 * Verifica delegación al repositorio y construcción de respuesta
 */
describe('GetNotificationsUseCase', () => {
  let useCase: GetNotificationsUseCase;
  let mockRepo: INotificationRepository;

  const sampleNotification: Notification = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    certificateId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    sentAt: '2026-02-18T00:00:00Z',
    recipientEmails: ['admin@test.com'],
    subject: 'Certificado WARNING',
    expirationStatusAtTime: ExpirationStatus.WARNING,
    result: NotificationResult.SENT,
    errorMessage: null,
  };

  beforeEach(() => {
    mockRepo = {
      findAll: vi.fn(),
      findByCertificateId: vi.fn(),
      findLastByCertificateId: vi.fn(),
      save: vi.fn(),
    };

    useCase = new GetNotificationsUseCase(mockRepo);
  });

  it('debería devolver total y notificaciones', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([sampleNotification]);

    const result = await useCase.execute({});

    expect(result.total).toBe(1);
    expect(result.notifications).toEqual([sampleNotification]);
  });

  it('debería devolver total 0 y array vacío si no hay notificaciones', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([]);

    const result = await useCase.execute({});

    expect(result.total).toBe(0);
    expect(result.notifications).toEqual([]);
  });

  it('debería pasar los filtros al repositorio', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([sampleNotification]);
    const filters = { result: NotificationResult.SENT, expirationStatus: ExpirationStatus.WARNING };

    await useCase.execute(filters);

    expect(mockRepo.findAll).toHaveBeenCalledWith(filters);
  });
});
