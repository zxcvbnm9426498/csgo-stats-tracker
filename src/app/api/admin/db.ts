// Database layer using Prisma with PostgreSQL
import prisma from '@/lib/prisma';

// Admin model
export interface Admin {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'moderator';
  createdAt: string;
}

// Log model
export interface Log {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ip?: string;
  timestamp: string;
}

// Account model
export interface Account {
  id: string;
  username: string;
  phone: string;
  steamId?: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

// Read operations
export async function getAdmins(): Promise<Admin[]> {
  try {
    const admins = await prisma.admin.findMany();
    return admins.map((admin) => ({
      id: admin.id,
      username: admin.username,
      password: admin.password,
      role: admin.role as 'admin' | 'moderator',
      createdAt: admin.createdAt.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
}

export async function getLogs(): Promise<Log[]> {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { timestamp: 'desc' }
    });
    return logs.map((log) => ({
      id: log.id,
      userId: log.userId || undefined,
      action: log.action,
      details: log.details,
      ip: log.ip || undefined,
      timestamp: log.timestamp.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
}

export async function getAccounts(): Promise<Account[]> {
  try {
    const accounts = await prisma.account.findMany();
    return accounts.map((account) => ({
      id: account.id,
      username: account.username,
      phone: account.phone,
      steamId: account.steamId || undefined,
      status: account.status as 'active' | 'suspended' | 'banned',
      createdAt: account.createdAt.toISOString(),
      lastLogin: account.lastLogin?.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

// Add log
export async function addLog(log: Omit<Log, 'id' | 'timestamp'>): Promise<Log> {
  try {
    const newLog = await prisma.log.create({
      data: {
        userId: log.userId,
        action: log.action,
        details: log.details,
        ip: log.ip
      }
    });
    
    return {
      id: newLog.id,
      userId: newLog.userId || undefined,
      action: newLog.action,
      details: newLog.details,
      ip: newLog.ip || undefined,
      timestamp: newLog.timestamp.toISOString()
    };
  } catch (error) {
    console.error('Error adding log:', error);
    throw error;
  }
}

// Account operations
export async function addAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  try {
    const newAccount = await prisma.account.create({
      data: {
        username: account.username,
        phone: account.phone,
        steamId: account.steamId,
        status: account.status,
        lastLogin: account.lastLogin ? new Date(account.lastLogin) : null
      }
    });
    
    return {
      id: newAccount.id,
      username: newAccount.username,
      phone: newAccount.phone,
      steamId: newAccount.steamId || undefined,
      status: newAccount.status as 'active' | 'suspended' | 'banned',
      createdAt: newAccount.createdAt.toISOString(),
      lastLogin: newAccount.lastLogin?.toISOString()
    };
  } catch (error) {
    console.error('Error adding account:', error);
    throw error;
  }
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account | null> {
  try {
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        username: data.username,
        phone: data.phone,
        steamId: data.steamId,
        status: data.status,
        lastLogin: data.lastLogin ? new Date(data.lastLogin) : undefined
      }
    });
    
    return {
      id: updatedAccount.id,
      username: updatedAccount.username,
      phone: updatedAccount.phone,
      steamId: updatedAccount.steamId || undefined,
      status: updatedAccount.status as 'active' | 'suspended' | 'banned',
      createdAt: updatedAccount.createdAt.toISOString(),
      lastLogin: updatedAccount.lastLogin?.toISOString()
    };
  } catch (error) {
    console.error('Error updating account:', error);
    return null;
  }
}

export async function deleteAccount(id: string): Promise<boolean> {
  try {
    await prisma.account.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    return false;
  }
}

// Admin authentication
export async function verifyAdmin(username: string, password: string): Promise<Admin | null> {
  try {
    const admin = await prisma.admin.findFirst({
      where: {
        username,
        password
      }
    });
    
    if (!admin) return null;
    
    return {
      id: admin.id,
      username: admin.username,
      password: admin.password,
      role: admin.role as 'admin' | 'moderator',
      createdAt: admin.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return null;
  }
}

export async function addAdmin(admin: Omit<Admin, 'id' | 'createdAt'>): Promise<Admin> {
  try {
    const newAdmin = await prisma.admin.create({
      data: {
        username: admin.username,
        password: admin.password,
        role: admin.role
      }
    });
    
    return {
      id: newAdmin.id,
      username: newAdmin.username,
      password: newAdmin.password,
      role: newAdmin.role as 'admin' | 'moderator',
      createdAt: newAdmin.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Error adding admin:', error);
    throw error;
  }
} 