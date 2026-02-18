/**
 * Hook para verificar permisos basados en roles
 * Utiliza el sistema RBAC de auth_APP
 */

import { useAuth } from './useAuth';

type Resource = 'certificates' | 'notifications' | 'users' | 'roles';
type Action = 'create' | 'read' | 'update' | 'delete' | 'send' | 'manage';

interface PermissionMatrix {
  [role: string]: {
    [resource: string]: Action[];
  };
}

/**
 * Matriz de permisos basada en el esquema de auth_APP
 * Refleja la configuración de la tabla permissions y role_permissions
 */
const PERMISSIONS: PermissionMatrix = {
  admin: {
    certificates: ['create', 'read', 'update', 'delete'],
    notifications: ['send', 'read']
  },
  editor: {
    certificates: ['create', 'read', 'update']
  },
  viewer: {
    certificates: ['read']
  },
  auditor: {
    certificates: ['read'],
    notifications: ['read']
  }
};

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
 * Hook personalizado para verificar permisos basados en roles
 * 🔒 SEGURO: Los roles vienen del token JWT en httpOnly cookie
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  
  // Obtener roles del usuario desde el token JWT (siempre es un array)
  const roles: string[] = user?.roles || [];
  
  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (resource: Resource, action: Action): boolean => {
    // Si no hay usuario autenticado, no tiene permisos
    if (!roles || roles.length === 0) {
      return false;
    }
    
    // Verificar cada rol del usuario
    for (const userRole of roles) {
      const rolePermissions = PERMISSIONS[userRole];
      
      if (rolePermissions?.[resource]?.includes(action)) {
        return true;
      }
    }
    
    return false;
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
