const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('teleai_token', token);
    } else {
      localStorage.removeItem('teleai_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('teleai_token');
    }
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const headers: Record<string, string> = {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    return json;
  }

  // Auth
  register(data: { username: string; password: string; displayName: string }) {
    return this.request<{ token: string; user: any }>('POST', '/auth/register', data);
  }

  login(data: { username: string; password: string }) {
    return this.request<{ token: string; user: any }>('POST', '/auth/login', data);
  }

  logout() {
    return this.request('POST', '/auth/logout');
  }

  getMe() {
    return this.request<any>('GET', '/auth/me');
  }

  // Users
  searchUsers(q: string) {
    return this.request<any[]>('GET', `/users/search?q=${encodeURIComponent(q)}`);
  }

  getUser(id: string) {
    return this.request<any>('GET', `/users/${id}`);
  }

  updateProfile(data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    return this.request<any>('PATCH', '/users/me', data);
  }

  updateSettings(data: Record<string, any>) {
    return this.request<any>('PATCH', '/users/me/settings', data);
  }

  getContacts() {
    return this.request<any[]>('GET', '/users/me/contacts');
  }

  addContact(userId: string) {
    return this.request('POST', '/users/me/contacts', { userId });
  }

  removeContact(userId: string) {
    return this.request('DELETE', `/users/me/contacts/${userId}`);
  }

  // Chats
  getChats() {
    return this.request<any[]>('GET', '/chats');
  }

  createPrivateChat(userId: string) {
    return this.request<any>('POST', '/chats/private', { userId });
  }

  createGroup(title: string, participantIds: string[]) {
    return this.request<any>('POST', '/chats/group', { title, participantIds });
  }

  createChannel(title: string, description?: string) {
    return this.request<any>('POST', '/chats/channel', { title, description });
  }

  getMessages(chatId: string, limit = 50, before?: string) {
    let url = `/chats/${chatId}/messages?limit=${limit}`;
    if (before) url += `&before=${before}`;
    return this.request<any[]>('GET', url);
  }

  sendMessage(chatId: string, data: { text?: string; type?: string; replyToId?: string }) {
    return this.request<any>('POST', `/chats/${chatId}/messages`, data);
  }

  editMessage(chatId: string, messageId: string, text: string) {
    return this.request<any>('PATCH', `/chats/${chatId}/messages/${messageId}`, { text });
  }

  deleteMessage(chatId: string, messageId: string) {
    return this.request('DELETE', `/chats/${chatId}/messages/${messageId}`);
  }

  toggleReaction(chatId: string, messageId: string, emoji: string) {
    return this.request('POST', `/chats/${chatId}/messages/${messageId}/reactions`, { emoji });
  }

  togglePin(chatId: string, messageId: string) {
    return this.request<any>('POST', `/chats/${chatId}/messages/${messageId}/pin`);
  }

  getPinnedMessage(chatId: string) {
    return this.request<any>('GET', `/chats/${chatId}/pinned`);
  }

  searchMessages(chatId: string, query: string) {
    return this.request<any[]>('GET', `/chats/${chatId}/messages/search?q=${encodeURIComponent(query)}`);
  }

  getChatMembers(chatId: string) {
    return this.request<any[]>('GET', `/chats/${chatId}/members`);
  }

  joinChat(inviteLink: string) {
    return this.request<any>('POST', `/chats/join/${inviteLink}`);
  }

  leaveChat(chatId: string) {
    return this.request('DELETE', `/chats/${chatId}/leave`);
  }

  // Media
  async uploadFile(file: File): Promise<{ success: boolean; data?: any; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    return res.json();
  }
}

export const api = new ApiClient();
