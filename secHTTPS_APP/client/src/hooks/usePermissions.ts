/**
 * Hook para verificar permisos basados en roles (RBAC)
 * 🔐 SEGURO: Los permisos se calculan dinámicamente en el backend
 * basándose en los roles del usuario desde el token JWT (httpOnly cookie)
 * 
 * ✅ VENTAJAS DE SEGURIDAD:
 * - El usuario solo ve SUS permisos (no todos los roles del sistema)
 * - Menor superficie de ataque (no expone estructura completa de permisos)
 * - Cambios en permisos no requieren recompilar frontend
 * - Backend es única fuente de verdad
 */

import { useAuth } from './useAuth';

type Resource = 'certificates' | 'notifications' | 'users' | 'roles';
type Action = 'create' | 'read' | 'update' | 'delete' | 'send' | 'manage';

export interface UsePermissionsReturn {
  /**
   * Verifica si el usuario tiene permiso para realizar una acción en un recurso
   * @param resource - Recurso a verificar (certificates, notifications, etc.)
   * @param action - Acción a verificar (create, read, update, delete, send, manage)
   * @returns true si tiene permiso, false en caso contrario
   */
  hasPermission: (resource: Resource, action: Action) => boolean;
  
  /**
   * Verificaciones específicas comunes
   */
  canCreateCertificates: boolean;
  canUpdateCertificates: boolean;
  canDeleteCertificates: boolean;
  canReadCertificates: boolean;
  canSendNotifications: boolean;
  canReadNotifications: boolean;
  
  /**
   * Roles del usuario actual
   */
  roles: string[];
  
  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole: (role: string) => boolean;
  
  /**
   * Verifica si el usuario es admin
   */
  isAdmin: boolean;
}

/**
 * Hook personalizado para verificar permisos
 * 🔒 SEGURO: Los permisos vienen calculados del backend (no hardcodeados)
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  
  // Obtener roles y permisos del usuario (vienen del backend vía JWT)
  const roles: string[] = user?.roles || [];
  const permissions: Record<string, string[]> = user?.permissions || {};
  
  /**
   * Verifica si el usuario tiene un permiso específico
   * 🔐 Usa los permisos calculados por el backend
   */
  const hasPermission = (resource: Resource, action: Action): boolean => {
    // Si no hay usuario autenticado, no tiene permisos
    if (!user) {
      return false;
    }
    
    // Verificar si tiene el permiso en la lista calculada por el backend
    return permissions[resource]?.includes(action) ?? false;
  };
  
  /**
   * Verifica si el usuario tiene un rol específico
   */
  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };
  
  return {
    hasPermission,
    
    // Permisos de certificates
    canCreateCertificates: hasPermission('certificates', 'create'),
    canUpdateCertificates: hasPermission('certificates', 'update'),
    canDeleteCertificates: hasPermission('certificates', 'delete'),
    canReadCertificates: hasPermission('certificates', 'read'),
    
    // Permisos de notifications
    canSendNotifications: hasPermission('notifications', 'send'),
    canReadNotifications: hasPermission('notifications', 'read'),
    
    // Información de roles
    roles,
    hasRole,
    isAdmin: hasRole('admin')
  };
}
