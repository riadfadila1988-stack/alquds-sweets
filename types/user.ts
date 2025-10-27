export interface User {
  _id: string;
  name: string;
  idNumber: string; // Unique identifier for login
  password: string; // Hashed password
  role: 'admin' | 'employee'; // User role
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserRequest {
  name: string;
  idNumber: string;
  password: string;
  role: 'admin' | 'employee';
  active: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  idNumber?: string;
  password?: string;
  role?: 'admin' | 'employee';
  active?: boolean;
}
