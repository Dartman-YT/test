import { UserProfile, CareerOption, RoadmapPhase } from '../types';

const KEYS = {
  USERS: 'pathfinder_users',
  CURRENT_USER_ID: 'pathfinder_current_user_id',
  CAREER_DATA: 'pathfinder_career_data_', // Keyed by userId_careerId
  ROADMAP: 'pathfinder_roadmap_', // Keyed by userId_careerId
};

export const saveUser = (user: UserProfile & { password?: string }) => {
  const users = getUsers();
  // In a real app, we'd hash the password.
  users[user.id] = user;
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const getUsers = (): Record<string, UserProfile & { password?: string }> => {
  const str = localStorage.getItem(KEYS.USERS);
  return str ? JSON.parse(str) : {};
};

export const setCurrentUser = (id: string | null) => {
  if (id) localStorage.setItem(KEYS.CURRENT_USER_ID, id);
  else localStorage.removeItem(KEYS.CURRENT_USER_ID);
};

export const getCurrentUserId = (): string | null => {
  return localStorage.getItem(KEYS.CURRENT_USER_ID);
};

// Save career details specifically for a user's selected career path
export const saveCareerData = (userId: string, careerId: string, data: CareerOption) => {
  localStorage.setItem(`${KEYS.CAREER_DATA}${userId}_${careerId}`, JSON.stringify(data));
};

export const getCareerData = (userId: string, careerId: string): CareerOption | null => {
  const str = localStorage.getItem(`${KEYS.CAREER_DATA}${userId}_${careerId}`);
  return str ? JSON.parse(str) : null;
};

// Roadmap is also specific to the career instance
export const saveRoadmap = (userId: string, careerId: string, roadmap: RoadmapPhase[]) => {
  localStorage.setItem(`${KEYS.ROADMAP}${userId}_${careerId}`, JSON.stringify(roadmap));
};

export const getRoadmap = (userId: string, careerId: string): RoadmapPhase[] | null => {
  const str = localStorage.getItem(`${KEYS.ROADMAP}${userId}_${careerId}`);
  return str ? JSON.parse(str) : null;
};
