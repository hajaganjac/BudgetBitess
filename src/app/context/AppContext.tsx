import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  recipes as RECIPES_DATA,
  badges as BADGES_TEMPLATE,
  levels as LEVELS,
  initialUser,
  weekDays,
  mealSlots,
  type Recipe,
  type GroceryItem,
  type WeekSlot,
  type Badge,
} from '../data/mockData';

// New users start with a clean slate — no pre-filled meals, grocery items,
// streaks, or XP. Achievements are earned from zero.
const EMPTY_TODAYS_PLAN: TodaysPlanEntry[] = [];
const EMPTY_TOTALS: TodaysTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 };
const EMPTY_GROCERY: GroceryItem[] = [];
const EMPTY_WEEK_PLAN: WeekSlot[] = weekDays.flatMap(d =>
  mealSlots.map(m => ({ day: d, meal: m, recipeId: null as number | null }))
);

export interface DailySpending { day: string; value: number }
const EMPTY_WEEKLY_SPENDING: DailySpending[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({ day, value: 0 }));

const FRESH_BADGES: Badge[] = BADGES_TEMPLATE.map(b => ({ ...b, unlocked: false, progress: 0, progressLabel: b.progressLabel.replace(/^\d+/, '0') }));

export type MotivationStyle = 'calm' | 'balanced' | 'motivated';

export interface TodaysPlanEntry {
  meal: string;
  recipeId: number;
  kcal: number;
}

export interface TodaysTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
}

interface PersistedData {
  studentName: string;
  studentEmoji: string;
  quietMode: boolean;
  motivationStyle: MotivationStyle;
  weeklyMealGoal: number;
  calorieGoal: number;
  weeklyBudget: number;
  weeklySpent: number;
  weeklyMealsCooked: number;
  streakDays: number;
  level: number;
  xp: number;
  todaysPlan: TodaysPlanEntry[];
  todaysTotals: TodaysTotals;
  favorites: number[];
  groceryItems: GroceryItem[];
  weekPlan: WeekSlot[];
  savedThisMonth: number;
  weeklySpendingData: DailySpending[];
  userBadges: Badge[];
}

interface AppContextType {
  recipes: Recipe[];
  studentName: string;
  setStudentName: (n: string) => void;
  studentEmoji: string;
  setStudentEmoji: (e: string) => void;
  quietMode: boolean;
  setQuietMode: (v: boolean) => void;
  motivationStyle: MotivationStyle;
  setMotivationStyle: (s: MotivationStyle) => void;
  weeklyMealGoal: number;
  setWeeklyMealGoal: (n: number) => void;
  calorieGoal: number;
  setCalorieGoal: (g: number) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  weeklySpent: number;
  savedThisMonth: number;
  weeklyMealsCooked: number;
  weeklySpendingData: DailySpending[];
  streakDays: number;
  level: number;
  levelName: string;
  xp: number;
  xpForNext: number;
  todaysPlan: TodaysPlanEntry[];
  todaysTotals: TodaysTotals;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  groceryItems: GroceryItem[];
  toggleGrocery: (id: string) => void;
  clearBought: () => void;
  addGrocery: (name: string, store?: GroceryItem['store']) => void;
  weekPlan: WeekSlot[];
  setWeekSlot: (day: WeekSlot['day'], meal: WeekSlot['meal'], recipeId: number | null) => void;
  cookRecipe: (recipe: Recipe) => void;
  toast: { id: number; message: string } | null;
  dismissToast: () => void;
  badges: Badge[];
  levels: typeof LEVELS;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DATA_KEY_PREFIX = 'budgetbites_data_';

function loadPersisted(userKey: string): Partial<PersistedData> {
  try {
    const raw = localStorage.getItem(DATA_KEY_PREFIX + userKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersisted(userKey: string, data: PersistedData) {
  try {
    localStorage.setItem(DATA_KEY_PREFIX + userKey, JSON.stringify(data));
  } catch { /* ignore quota */ }
}

export function AppProvider({
  children,
  userKey = 'guest',
  initialName  = initialUser.name,
  initialEmoji = initialUser.avatar,
}: {
  children: React.ReactNode;
  userKey?: string;
  initialName?: string;
  initialEmoji?: string;
}) {
  const stored = useMemo(() => loadPersisted(userKey), [userKey]);

  const [studentName,   setStudentName]  = useState(stored.studentName ?? initialName);
  const [studentEmoji,  setStudentEmoji] = useState(stored.studentEmoji ?? initialEmoji);

  const [quietMode, setQuietMode] = useState(stored.quietMode ?? false);
  const [motivationStyle, setMotivationStyle] = useState<MotivationStyle>(stored.motivationStyle ?? 'balanced');
  const [weeklyMealGoal, setWeeklyMealGoal] = useState(stored.weeklyMealGoal ?? 4);
  const [calorieGoal, setCalorieGoal] = useState(stored.calorieGoal ?? 2000);
  const [weeklyBudget, setWeeklyBudget] = useState(stored.weeklyBudget ?? 35);

  const [weeklySpent, setWeeklySpent] = useState(stored.weeklySpent ?? 0);
  const [savedThisMonth, setSavedThisMonth] = useState(stored.savedThisMonth ?? 0);
  const [weeklyMealsCooked, setWeeklyMealsCooked] = useState(stored.weeklyMealsCooked ?? 0);
  const [weeklySpendingData, setWeeklySpendingData] = useState<DailySpending[]>(stored.weeklySpendingData ?? EMPTY_WEEKLY_SPENDING);
  const [userBadges, setUserBadges] = useState<Badge[]>(stored.userBadges ?? FRESH_BADGES);
  const [streakDays] = useState(stored.streakDays ?? 0);
  const [level] = useState(stored.level ?? 1);
  const [xp] = useState(stored.xp ?? 0);

  const [todaysPlan, setTodaysPlan] = useState<TodaysPlanEntry[]>(stored.todaysPlan ?? EMPTY_TODAYS_PLAN);
  const [todaysTotals, setTodaysTotals] = useState<TodaysTotals>(stored.todaysTotals ?? EMPTY_TOTALS);

  const [favorites, setFavorites] = useState<number[]>(stored.favorites ?? []);

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(stored.groceryItems ?? EMPTY_GROCERY);
  const [weekPlan, setWeekPlan] = useState<WeekSlot[]>(stored.weekPlan ?? EMPTY_WEEK_PLAN);

  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  // Persist on every meaningful change.
  const firstRun = useRef(true);
  useEffect(() => {
    // Skip writing on mount if we just loaded (avoid round-trip noise).
    if (firstRun.current) { firstRun.current = false; return; }
    savePersisted(userKey, {
      studentName, studentEmoji, quietMode, motivationStyle, weeklyMealGoal,
      calorieGoal, weeklyBudget, weeklySpent, weeklyMealsCooked,
      streakDays, level, xp,
      todaysPlan, todaysTotals, favorites, groceryItems, weekPlan,
      savedThisMonth, weeklySpendingData, userBadges,
    });
  }, [userKey, studentName, studentEmoji, quietMode, motivationStyle, weeklyMealGoal,
      calorieGoal, weeklyBudget, weeklySpent, weeklyMealsCooked, streakDays, level, xp,
      todaysPlan, todaysTotals, favorites, groceryItems, weekPlan,
      savedThisMonth, weeklySpendingData, userBadges]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  const toggleGrocery = useCallback((id: string) => {
    setGroceryItems(prev => prev.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  }, []);

  const clearBought = useCallback(() => {
    setGroceryItems(prev => prev.filter(i => !i.bought));
  }, []);

  const addGrocery = useCallback((name: string, store?: GroceryItem['store']) => {
    if (!name.trim()) return;
    setGroceryItems(prev => [...prev, { id: `g-${Date.now()}`, name: name.trim(), store, bought: false }]);
  }, []);

  const setWeekSlot = useCallback((day: WeekSlot['day'], meal: WeekSlot['meal'], recipeId: number | null) => {
    setWeekPlan(prev => prev.map(s => s.day === day && s.meal === meal ? { ...s, recipeId } : s));
  }, []);

  const cookRecipe = useCallback((recipe: Recipe) => {
    setWeeklyMealsCooked(n => n + 1);
    setWeeklySpent(s => +(s + recipe.price).toFixed(2));
    setTodaysTotals(t => ({
      kcal: t.kcal + recipe.kcal,
      protein: t.protein + recipe.protein,
      carbs: t.carbs + recipe.carbs,
      fat: t.fat + recipe.fat,
      cost: +(t.cost + recipe.price).toFixed(2),
    }));
    setTodaysPlan(prev => [...prev, { meal: 'Logged', recipeId: recipe.id, kcal: recipe.kcal }]);

    const todayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    setWeeklySpendingData(prev =>
      prev.map(d => d.day === todayAbbr ? { ...d, value: +(d.value + recipe.price).toFixed(2) } : d)
    );

    const avgEatOutCost = 8;
    setSavedThisMonth(prev => +(prev + Math.max(0, avgEatOutCost - recipe.price)).toFixed(2));

    setToast({
      id: Date.now(),
      message: `Logged ${recipe.kcal} kcal · ${recipe.protein}g P / ${recipe.carbs}g C / ${recipe.fat}g F to today`,
    });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const value: AppContextType = useMemo(() => ({
    recipes: RECIPES_DATA,
    studentName, setStudentName, studentEmoji, setStudentEmoji,
    quietMode, setQuietMode,
    motivationStyle, setMotivationStyle,
    weeklyMealGoal, setWeeklyMealGoal,
    calorieGoal, setCalorieGoal,
    weeklyBudget, setWeeklyBudget,
    weeklySpent, savedThisMonth, weeklyMealsCooked, weeklySpendingData,
    streakDays,
    level, levelName: LEVELS.find(l => l.level === level)?.name ?? 'Hungry Student',
    xp, xpForNext: initialUser.xpForNext,
    todaysPlan, todaysTotals,
    favorites, toggleFavorite,
    groceryItems, toggleGrocery, clearBought, addGrocery,
    weekPlan, setWeekSlot,
    cookRecipe,
    toast, dismissToast,
    badges: userBadges, levels: LEVELS,
  }), [studentName, studentEmoji, quietMode, motivationStyle, weeklyMealGoal, calorieGoal, weeklyBudget,
       weeklySpent, savedThisMonth, weeklyMealsCooked, weeklySpendingData, streakDays, level, xp,
       todaysPlan, todaysTotals,
       favorites, toggleFavorite, groceryItems, toggleGrocery, clearBought, addGrocery,
       weekPlan, setWeekSlot, cookRecipe, toast, dismissToast, userBadges]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
