/**
 * Authentication module for Sign In App integration
 */

import { User, UserPermissions } from '../utils/models.js';

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  apiBaseUrl: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export class AuthManager {
  private config: AuthConfig;
  private currentToken: AuthToken | null = null;
  private currentUser: User | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Initialize authentication with stored tokens
   */
  async initialize(): Promise<boolean> {
    try {
      const storedToken = await this.getStoredToken();
      if (storedToken && !this.isTokenExpired(storedToken)) {
        this.currentToken = storedToken;
        this.currentUser = await this.fetchUserProfile();
        return true;
      }
      
      if (storedToken?.refreshToken) {
        return await this.refreshAccessToken();
      }
      
      return false;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return false;
    }
  }

  /**
   * Start OAuth flow for Sign In App
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      state: this.generateState()
    });

    return `${this.config.apiBaseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<AuthToken> {
    if (!this.validateState(state)) {
      throw new Error('Invalid state parameter');
    }

    const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const token: AuthToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      tokenType: 'Bearer'
    };

    this.currentToken = token;
    await this.storeToken(token);
    this.currentUser = await this.fetchUserProfile();
    
    return token;
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.currentToken?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.currentToken.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      const newToken: AuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || this.currentToken.refreshToken,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        tokenType: 'Bearer'
      };

      this.currentToken = newToken;
      await this.storeToken(newToken);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    if (!this.currentToken || this.isTokenExpired(this.currentToken)) {
      return null;
    }
    return this.currentToken.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentToken && !this.isTokenExpired(this.currentToken);
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    this.currentToken = null;
    this.currentUser = null;
    await this.clearStoredToken();
  }

  /**
   * Fetch user profile from Sign In App
   */
  private async fetchUserProfile(): Promise<User> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No valid access token');
    }

    const response = await fetch(`${this.config.apiBaseUrl}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const userData = await response.json() as {
      id: string;
      username: string;
      email: string;
      created_at: string;
    };
    
    const defaultPermissions: UserPermissions = {
      canView: true,
      canDownload: true,
      canUpload: true,
      canShare: true,
      canCreateFolders: true
    };

    return {
      userId: userData.id,
      username: userData.username,
      email: userData.email,
      signInAppId: userData.id,
      linkedDevices: [],
      linkedUsers: [],
      permissions: defaultPermissions,
      createdAt: new Date(userData.created_at),
      lastLogin: new Date()
    };
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: AuthToken): boolean {
    return new Date() >= token.expiresAt;
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Validate OAuth state parameter
   */
  private validateState(state: string): boolean {
    // In a real implementation, you'd store and validate the state
    return state.length > 0;
  }

  /**
   * Store token securely (platform-specific implementation needed)
   */
  private async storeToken(token: AuthToken): Promise<void> {
    // This will be implemented per platform
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flynas_auth_token', JSON.stringify(token));
    }
  }

  /**
   * Retrieve stored token (platform-specific implementation needed)
   */
  private async getStoredToken(): Promise<AuthToken | null> {
    // This will be implemented per platform
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('flynas_auth_token');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          expiresAt: new Date(parsed.expiresAt)
        };
      }
    }
    return null;
  }

  /**
   * Clear stored token (platform-specific implementation needed)
   */
  private async clearStoredToken(): Promise<void> {
    // This will be implemented per platform
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('flynas_auth_token');
    }
  }
}

/**
 * Create auth manager instance with configuration
 */
export function createAuthManager(config: AuthConfig): AuthManager {
  return new AuthManager(config);
}