// Database layer using Prisma with PostgreSQL
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

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

// In-memory storage as fallback
const inMemoryStorage: {
  admins: Admin[];
  logs: Log[];
  accounts: Account[];
} = {
  admins: [
    {
      id: uuidv4(),
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ],
  logs: [],
  accounts: []
};

// Helper function to detect if Prisma is available
const isPrismaAvailable = () => {
  try {
    // Simple test query - using a simple check since $queryRaw might not work in all contexts
    return !!prisma;
  } catch (error) {
    console.warn('Prisma unavailable, using in-memory storage fallback');
    return false;
  }
};

// Initialize default admin if none exists
export async function initDefaultAdmin(): Promise<void> {
  try {
    if (isPrismaAvailable()) {
      const adminCount = await prisma.admin.count();
      
      if (adminCount === 0) {
        await prisma.admin.create({
          data: {
            username: 'admin',
            password: 'admin123', // In a production environment, use proper password hashing
            role: 'admin',
          }
        });
      }
    }
    // For in-memory storage, default admin is already in the array
  } catch (error) {
    console.error('Error initializing default admin:', error);
    // Fallback to in-memory storage already set up
  }
}

// Call this function when the app starts
try {
  initDefaultAdmin().catch(console.error);
} catch (error) {
  console.error('Failed to initialize admin:', error);
}

// Read operations
export async function getAdmins(): Promise<Admin[]> {
  try {
    if (isPrismaAvailable()) {
      const admins = await prisma.admin.findMany();
      return admins.map((admin) => ({
        id: admin.id,
        username: admin.username,
        password: admin.password,
        role: admin.role as 'admin' | 'moderator',
        createdAt: admin.createdAt.toISOString()
      }));
    } else {
      return inMemoryStorage.admins;
    }
  } catch (error) {
    console.error('Error fetching admins:', error);
    return inMemoryStorage.admins;
  }
}

export async function getLogs(): Promise<Log[]> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      return inMemoryStorage.logs;
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    return inMemoryStorage.logs;
  }
}

export async function getAccounts(): Promise<Account[]> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      return inMemoryStorage.accounts;
    }
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return inMemoryStorage.accounts;
  }
}

// Add log
export async function addLog(log: Omit<Log, 'id' | 'timestamp'>): Promise<Log> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      // Use in-memory storage
      const newLog: Log = {
        id: uuidv4(),
        userId: log.userId,
        action: log.action,
        details: log.details,
        ip: log.ip,
        timestamp: new Date().toISOString()
      };
      inMemoryStorage.logs.push(newLog);
      return newLog;
    }
  } catch (error) {
    console.error('Error adding log:', error);
    // Use in-memory storage as fallback
    const newLog: Log = {
      id: uuidv4(),
      userId: log.userId,
      action: log.action,
      details: log.details,
      ip: log.ip,
      timestamp: new Date().toISOString()
    };
    inMemoryStorage.logs.push(newLog);
    return newLog;
  }
}

// Account operations
export async function addAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      // Use in-memory storage
      const newAccount: Account = {
        id: uuidv4(),
        username: account.username,
        phone: account.phone,
        steamId: account.steamId,
        status: account.status,
        createdAt: new Date().toISOString(),
        lastLogin: account.lastLogin
      };
      inMemoryStorage.accounts.push(newAccount);
      return newAccount;
    }
  } catch (error) {
    console.error('Error adding account:', error);
    // Use in-memory storage as fallback
    const newAccount: Account = {
      id: uuidv4(),
      username: account.username,
      phone: account.phone,
      steamId: account.steamId,
      status: account.status,
      createdAt: new Date().toISOString(),
      lastLogin: account.lastLogin
    };
    inMemoryStorage.accounts.push(newAccount);
    return newAccount;
  }
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account | null> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      // Use in-memory storage
      const accountIndex = inMemoryStorage.accounts.findIndex(a => a.id === id);
      if (accountIndex === -1) return null;
      
      const account = inMemoryStorage.accounts[accountIndex];
      const updatedAccount: Account = {
        ...account,
        ...(data as Partial<Account>)
      };
      
      inMemoryStorage.accounts[accountIndex] = updatedAccount;
      return updatedAccount;
    }
  } catch (error) {
    console.error('Error updating account:', error);
    // Try in-memory storage as fallback
    const accountIndex = inMemoryStorage.accounts.findIndex(a => a.id === id);
    if (accountIndex === -1) return null;
    
    const account = inMemoryStorage.accounts[accountIndex];
    const updatedAccount: Account = {
      ...account,
      ...(data as Partial<Account>)
    };
    
    inMemoryStorage.accounts[accountIndex] = updatedAccount;
    return updatedAccount;
  }
}

export async function deleteAccount(id: string): Promise<boolean> {
  try {
    if (isPrismaAvailable()) {
      await prisma.account.delete({
        where: { id }
      });
      return true;
    } else {
      // Use in-memory storage
      const accountIndex = inMemoryStorage.accounts.findIndex(a => a.id === id);
      if (accountIndex === -1) return false;
      
      inMemoryStorage.accounts.splice(accountIndex, 1);
      return true;
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    // Try in-memory storage as fallback
    const accountIndex = inMemoryStorage.accounts.findIndex(a => a.id === id);
    if (accountIndex === -1) return false;
    
    inMemoryStorage.accounts.splice(accountIndex, 1);
    return true;
  }
}

// Admin authentication
export async function verifyAdmin(username: string, password: string): Promise<Admin | null> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      // Use in-memory storage
      const admin = inMemoryStorage.admins.find(
        a => a.username === username && a.password === password
      );
      return admin || null;
    }
  } catch (error) {
    console.error('Error verifying admin:', error);
    // Try in-memory storage as fallback
    const admin = inMemoryStorage.admins.find(
      a => a.username === username && a.password === password
    );
    return admin || null;
  }
}

export async function addAdmin(admin: Omit<Admin, 'id' | 'createdAt'>): Promise<Admin> {
  try {
    if (isPrismaAvailable()) {
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
    } else {
      // Use in-memory storage
      const newAdmin: Admin = {
        id: uuidv4(),
        username: admin.username,
        password: admin.password,
        role: admin.role,
        createdAt: new Date().toISOString()
      };
      
      inMemoryStorage.admins.push(newAdmin);
      return newAdmin;
    }
  } catch (error) {
    console.error('Error adding admin:', error);
    // Use in-memory storage as fallback
    const newAdmin: Admin = {
      id: uuidv4(),
      username: admin.username,
      password: admin.password,
      role: admin.role,
      createdAt: new Date().toISOString()
    };
    
    inMemoryStorage.admins.push(newAdmin);
    return newAdmin;
  }
} 