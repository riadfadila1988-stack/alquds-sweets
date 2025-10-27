import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/services/user';
import { User } from '@/types/user';

export function useUsers() {
  const { data, isLoading, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  return {
    users: data || [],
    isLoading,
    error: error?.message,
  };
}

