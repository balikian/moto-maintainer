'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { bikeDatabase } from './bikeDatabase';
import { Bike as BikeIcon, Gauge, Plus, Wrench, AlertTriangle, CheckCircle, Clock, X, Trash2, ChevronDown, User, RotateCcw, Pencil, Check, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signInWithGoogle, sendMagicLink, logout } from '@/lib/actions/auth';
import { completeTaskAction } from '@/lib/actions/tasks';
import AddCustomTaskModal from './components/AddCustomTaskModal';
import LogServiceModal from './components/LogServiceModal';
import ServiceHistoryView from './components/ServiceHistoryView';
import motorcyclesData from '@/lib/data/motorcycles.json';

interface Motorcycle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  current_mileage: number;
  created_at?: string;
  updated_at?: string;
}

interface MaintenanceTask {
  id: string;
  motorcycle_id: string;
  user_id: string;
  task_name: string;
  interval_mileage: number;
  interval_months: number;
  last_performed_mileage: number;
  last_performed_odometer?: number;
  last_performed_date: string | null;
  is_diy: boolean;
  created_at?: string;
}

type LogServiceFormValues = {
  taskId: string | null;
  taskName: string;
  performedAt: string;
  odometer: number;
  cost?: number | null;
  notes?: string | null;
};

const DEFAULT_MAINTENANCE_TASKS: Array<Pick<MaintenanceTask, 'task_name' | 'interval_mileage' | 'interval_months' | 'is_diy'>> = [
  {
    task_name: 'Engine Oil & Filter',
    interval_mileage: 5000,
    interval_months: 12,
    is_diy: true,
  },
  {
    task_name: 'Chain Clean & Tension',
    interval_mileage: 500,
    interval_months: 1,
    is_diy: true,
  },
  {
    task_name: 'Valve Clearance Check',
    interval_mileage: 15000,
    interval_months: 24,
    is_diy: false,
  },
];

export default function GarageDashboard() {
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [mileageInput, setMileageInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [magicEmail, setMagicEmail] = useState<string>('');
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);
  const [magicLoading, setMagicLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [customMakeName, setCustomMakeName] = useState<string>('');
  const [customModelName, setCustomModelName] = useState<string>('');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [isLogServiceModalOpen, setIsLogServiceModalOpen] = useState<boolean>(false);
  const [taskToLog, setTaskToLog] = useState<MaintenanceTask | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskErrors, setTaskErrors] = useState<string[]>([]);
  const [isSavingBike, setIsSavingBike] = useState<boolean>(false);

  const supabase = React.useMemo(() => createClient(), []);
  const currentYear = new Date().getFullYear();

  const unitLabel = unitSystem === 'metric' ? 'km' : 'mi';
  const convertDistance = (miles: number) => unitSystem === 'metric' ? miles * 1.60934 : miles;
  const formatDistance = (miles: number) => `${Math.round(convertDistance(miles)).toLocaleString()} ${unitLabel}`;
  const parseDistanceInput = (value: string) => {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(parsed)) return NaN;
    return unitSystem === 'metric' ? parsed / 1.60934 : parsed;
  };

  const pageBgClass = isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900';
  const cardBgClass = isDarkMode ? 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300';
  const selectedCardBgClass = isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-slate-100 border-amber-500 shadow-lg shadow-amber-500/5';
  const sectionCardClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const softCardClass = isDarkMode ? 'bg-slate-900/40 border-slate-900' : 'bg-white/90 border-slate-200';
  const secondaryTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  // Modal states for adding a bike
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newBike, setNewBike] = useState({
    year: currentYear,
    make: '',
    model: '',
    current_mileage: ''
  });
  const mileageInputRef = React.useRef<HTMLInputElement | null>(null);
  const monthsInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncMotorcycles = async (currentUser: SupabaseUser | null) => {
      if (!currentUser) {
        if (!mounted) return;
        setBikes([]);
        setTasks([]);
        setSelectedBikeId(null);
        setLoading(false);
        return;
      }

      const { data: userBikes, error } = await supabase
        .from('motorcycles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error('Failed to fetch motorcycles', error);
        setBikes([]);
        setTasks([]);
        setSelectedBikeId(null);
        setLoading(false);
        return;
      }

      const nextBikes = (userBikes ?? []) as Motorcycle[];
      setBikes(nextBikes);
      setSelectedBikeId((previousSelectedBikeId) =>
        nextBikes.some((bike) => bike.id === previousSelectedBikeId)
          ? previousSelectedBikeId
          : nextBikes[0]?.id ?? null
      );

      if (nextBikes.length === 0) {
        setTasks([]);
      }

      setLoading(false);
    };

    const applySessionState = async (currentUser: SupabaseUser | null) => {
      if (!mounted) return;

      setUser(currentUser);

      if (currentUser) {
        const url = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;
        setAvatarUrl(url || null);
      } else {
        setAvatarUrl(null);
      }

      setLoading(true);
      await syncMotorcycles(currentUser);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await applySessionState(data?.session?.user ?? null);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySessionState(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const fetchTasksForMotorcycle = React.useCallback(async (motorcycleId: string) => {
    const { data: bikeTasks, error } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('motorcycle_id', motorcycleId)
      .order('interval_mileage', { ascending: true });

    if (error) {
      console.error('Failed to fetch maintenance tasks', error);
      setTasks([]);
      return;
    }

    const normalizedTasks = ((bikeTasks ?? []) as Partial<MaintenanceTask>[]).map((task) => ({
      ...task,
      last_performed_mileage: Number(task.last_performed_mileage ?? task.last_performed_odometer ?? 0),
    })) as MaintenanceTask[];

    setTasks(normalizedTasks);
  }, [supabase]);

  useEffect(() => {
    if (!user || !selectedBikeId) {
      setTasks([]);
      return;
    }

    void fetchTasksForMotorcycle(selectedBikeId);
  }, [fetchTasksForMotorcycle, selectedBikeId, user]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = magicEmail.trim();

    if (!normalizedEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    setAuthError(null);
    setMagicLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', normalizedEmail);

      const result = await sendMagicLink(formData);
      if (result?.error) {
        setAuthError(result.error);
        setMagicLinkSent(false);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setAuthError('Unable to send a magic link right now. Please try again.');
      setMagicLinkSent(false);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleResetMagicLink = () => {
    setMagicEmail('');
    setMagicLinkSent(false);
    setAuthError(null);
  };

  const activeBike = bikes.find(b => b.id === selectedBikeId);
  const activeTasks = tasks.filter(t => t.motorcycle_id === selectedBikeId);
  const availableYears = useMemo(
    () => Array.from({ length: currentYear + 2 - 1970 }, (_, index) => currentYear + 1 - index),
    [currentYear]
  );
  const motorcycleRegistry = motorcyclesData as Record<string, { years: number[]; models: string[] }>;
  const availableMakes = useMemo(
    () => [...Object.keys(motorcycleRegistry).sort((a, b) => a.localeCompare(b)), 'Other'],
    [motorcycleRegistry]
  );
  const availableModels = useMemo(() => {
    if (!newBike.make || newBike.make === 'other') {
      return [];
    }

    const makeModels = motorcycleRegistry[newBike.make]?.models ?? [];
    return makeModels.length > 0 ? [...makeModels, 'Other'] : ['Other'];
  }, [motorcycleRegistry, newBike.make]);
  const hasMakeModels = Boolean(newBike.make && newBike.make !== 'other' && (motorcycleRegistry[newBike.make]?.models?.length ?? 0) > 0);
  const showCustomMakeInput = newBike.make === 'other';
  const showCustomModelInput = newBike.model === 'other' || (Boolean(newBike.make) && newBike.make !== 'other' && !hasMakeModels);
  const resolvedMake = newBike.make === 'other' ? customMakeName.trim() : newBike.make.trim();
  const resolvedModel = newBike.model === 'other' ? customModelName.trim() : newBike.model.trim();

  const handleMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBike) return;

    const newMileage = parseDistanceInput(mileageInput);
    if (isNaN(newMileage) || newMileage <= 0) return;

    const roundedMileage = Math.round(newMileage);
    const { error } = await supabase
      .from('motorcycles')
      .update({ current_mileage: roundedMileage })
      .eq('id', activeBike.id);

    if (error) {
      setTaskErrors((prev) => [...prev, `Unable to update odometer for ${activeBike.make} ${activeBike.model}.`]);
      return;
    }

    setBikes(prevBikes =>
      prevBikes.map(b =>
        b.id === activeBike.id ? { ...b, current_mileage: roundedMileage } : b
      )
    );
    setMileageInput('');
    setIsUpdating(false);
  };

  const handleYearChange = (value: string) => {
    const nextYear = Number(value);
    setNewBike((prev) => ({
      ...prev,
      year: nextYear,
      current_mileage: prev.current_mileage
    }));
    setCustomMakeName('');
    setCustomModelName('');
  };

  const handleMakeChange = (value: string) => {
    setNewBike((prev) => ({
      ...prev,
      make: value,
      model: '',
      current_mileage: prev.current_mileage
    }));
    setCustomMakeName('');
    setCustomModelName('');
  };

  const handleModelChange = (value: string) => {
    setNewBike((prev) => ({
      ...prev,
      model: value,
      current_mileage: prev.current_mileage
    }));
    if (value !== 'other') {
      setCustomModelName('');
    }
  };

  const handleAddBikeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setTaskErrors((prev) => [...prev, 'You must sign in before adding a motorcycle.']);
      return;
    }

    const trimmedMake = resolvedMake;
    const trimmedModel = resolvedModel;
    const parsedMileage = parseInt(newBike.current_mileage, 10) || 0;

    if (!trimmedMake || !trimmedModel || !newBike.current_mileage || Number(newBike.current_mileage) < 0) {
      setTaskErrors((prev) => [...prev, 'Please choose a valid make, model, and odometer reading before saving.']);
      return;
    }

    setIsSavingBike(true);

    try {
      const { data: insertedBike, error: bikeInsertError } = await supabase
        .from('motorcycles')
        .insert({
          user_id: user.id,
          year: Number(newBike.year),
          make: trimmedMake,
          model: trimmedModel,
          current_mileage: parsedMileage,
        })
        .select()
        .single();

      if (bikeInsertError || !insertedBike) {
        setTaskErrors((prev) => [...prev, 'Unable to add this motorcycle right now.']);
        return;
      }

      const newlyCreatedBike = insertedBike as Motorcycle;
      const today = new Date().toISOString().split('T')[0];
      const seededTasks = DEFAULT_MAINTENANCE_TASKS.map((task) => ({
        motorcycle_id: newlyCreatedBike.id,
        user_id: user.id,
        task_name: task.task_name,
        interval_mileage: task.interval_mileage,
        interval_months: task.interval_months,
        last_performed_mileage: newlyCreatedBike.current_mileage,
        last_performed_date: today,
        is_diy: task.is_diy,
      }));

      const { data: insertedTasks, error: taskInsertError } = await supabase
        .from('maintenance_tasks')
        .insert(seededTasks)
        .select();

      if (taskInsertError) {
        setTaskErrors((prev) => [...prev, `Added ${newlyCreatedBike.make} ${newlyCreatedBike.model}, but failed to seed its maintenance tasks.`]);
      }

      setBikes(prev => [...prev, newlyCreatedBike]);
      setTasks(((insertedTasks ?? []) as MaintenanceTask[]));
      setSelectedBikeId(newlyCreatedBike.id);

      setNewBike({
        year: currentYear,
        make: '',
        model: '',
        current_mileage: ''
      });
      setCustomMakeName('');
      setCustomModelName('');
      setIsModalOpen(false);
    } finally {
      setIsSavingBike(false);
    }
  };

  const handleRemoveBike = (bikeId: string, bikeName: string, e: React.MouseEvent) => {
    // Prevent the click from selecting the bike card underneath
    e.stopPropagation();

    const confirmed = window.confirm(`Are you sure you want to remove the ${bikeName} from your garage? This will clear all tracking data.`);
    if (!confirmed) return;

    void (async () => {
      const { error } = await supabase.from('motorcycles').delete().eq('id', bikeId);

      if (error) {
        setTaskErrors((prev) => [...prev, `Unable to remove ${bikeName} right now.`]);
        return;
      }

      const updatedBikes = bikes.filter(b => b.id !== bikeId);
      setBikes(updatedBikes);
      setTasks(prev => prev.filter(task => task.motorcycle_id !== bikeId));

      if (selectedBikeId === bikeId) {
        setSelectedBikeId(updatedBikes[0]?.id ?? null);
      }
    })();
  };

  const handleOpenLogServiceModal = (task?: MaintenanceTask | null) => {
    setTaskToLog(task ?? null);
    setIsLogServiceModalOpen(true);
  };

  const handleCloseLogServiceModal = () => {
    setIsLogServiceModalOpen(false);
    setTaskToLog(null);
  };

  const handleTaskLogged = async (values: LogServiceFormValues): Promise<string | null> => {
    if (!activeBike) return 'Select a bike before logging service.';

    const selectedTask = values.taskId
      ? activeTasks.find((task) => task.id === values.taskId)
      : null;

    if (values.taskId && !selectedTask) {
      return 'Selected task could not be found for this motorcycle.';
    }

    try {
      const result = await completeTaskAction({
        motorcycle_id: activeBike.id,
        task_id: values.taskId,
        task_name: values.taskName,
        performed_at: values.performedAt,
        odometer_at_service: values.odometer,
        notes: values.notes ?? null,
        cost: values.cost ?? null,
      });

      if (result.error) {
        return result.error || 'Unable to mark that maintenance item as logged.';
      }

      const nextOdometer = Math.max(0, Math.round(values.odometer));
      if (selectedTask) {
        setTasks(prev => prev.map(task =>
          task.id === selectedTask.id
            ? {
                ...task,
                last_performed_mileage: nextOdometer,
                last_performed_odometer: nextOdometer,
                last_performed_date: values.performedAt
              }
            : task
        ));
      }

      if (nextOdometer > activeBike.current_mileage) {
        setBikes((prev) => prev.map((bike) => (
          bike.id === activeBike.id
            ? { ...bike, current_mileage: nextOdometer }
            : bike
        )));
      }

      setHistoryRefreshKey((prev) => prev + 1);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'Unable to save the service log right now. Please try again.';
    }
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId((prev) => (prev === taskId ? null : taskId));
    if (typeof document !== 'undefined') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const handleSaveTaskEdit = async (taskId: string) => {
    const editedTask = tasks.find((task) => task.id === taskId);
    if (!editedTask) return;

    const { error } = await supabase
      .from('maintenance_tasks')
      .update({
        interval_mileage: editedTask.interval_mileage,
        interval_months: editedTask.interval_months,
      })
      .eq('id', taskId);

    if (error) {
      setTaskErrors((prev) => [...prev, `Unable to save interval changes for ${editedTask.task_name}.`]);
      return;
    }

    // Force the browser to explicitly drop focus from whatever field is currently blinking
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditingTaskId(null);
  };
  
  const handleDismissTaskError = (index: number) => {
    setTaskErrors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleResetTaskToDefault = async (taskId: string, taskName: string) => {
    if (!activeBike) return;

    const selectedModelData = bikeDatabase[activeBike.year]?.[activeBike.make]?.find((model) => model.name === activeBike.model);
    const defaultTask = selectedModelData?.tasks?.find((task) => task.task_name.toLowerCase() === taskName.trim().toLowerCase());

    if (!defaultTask) {
      setTaskErrors((prev) => [
        ...prev,
        `No default interval found for “${taskName}” on ${activeBike.year} ${activeBike.make} ${activeBike.model}.`
      ]);
      return;
    }

    const nextIntervalMileage = defaultTask.interval_mileage;
    const nextIntervalMonths = (defaultTask as { interval_months?: number }).interval_months || 0;
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({
        interval_mileage: nextIntervalMileage,
        interval_months: nextIntervalMonths,
      })
      .eq('id', taskId);

    if (error) {
      setTaskErrors((prev) => [...prev, `Unable to reset ${taskName} to its default interval.`]);
      return;
    }

    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? {
            ...task,
            interval_mileage: nextIntervalMileage,
            interval_months: nextIntervalMonths
          }
        : task
    ));
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('maintenance_tasks').delete().eq('id', taskId);

    if (error) {
      setTaskErrors((prev) => [...prev, 'Unable to delete that maintenance task right now.']);
      return;
    }

    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleIntervalMileageEdit = (taskId: string, value: string) => {
    const parsed = parseDistanceInput(value);
    const nextMileage = Number.isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed));

    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, interval_mileage: nextMileage } : task
    ));
  };

  const handleIntervalMonthsEdit = (taskId: string, value: string) => {
    const parsed = Number(value);
    const nextMonths = Number.isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed));

    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, interval_months: nextMonths } : task
    ));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${pageBgClass}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className={`text-sm ${secondaryTextClass}`}>Checking your garage access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${pageBgClass}`}>
        <div className={`w-full max-w-md rounded-3xl border p-8 shadow-xl ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
            <p className={`mt-2 text-sm ${secondaryTextClass}`}>Sign in to unlock your digital garage.</p>
          </div>
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || magicLoading}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
            >
              Sign in with Google
            </button>

            <div className="flex items-center gap-3">
              <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
              <span className={`text-xs font-semibold tracking-[0.18em] ${secondaryTextClass}`}>OR</span>
              <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
            </div>

            {magicLinkSent ? (
              <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-emerald-900/60 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50'}`}>
                <p className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  Sign-in link sent!
                </p>
                <p className={`mt-1 text-sm ${secondaryTextClass}`}>
                  We sent a one-click magic link to <span className="font-medium">{magicEmail}</span>. Tap the link in your email to open your garage.
                </p>
                <button
                  type="button"
                  onClick={handleResetMagicLink}
                  className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'}`}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
                <label htmlFor="magic-email" className="text-xs font-medium text-slate-400 mb-1.5 block text-left">
                  Email Address
                </label>
                <input
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={magicEmail}
                  onChange={(e) => {
                    setMagicEmail(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  disabled={magicLoading}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all ${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-amber-500' : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-500'}`}
                  placeholder="rider@example.com"
                  required
                />
                {authError && (
                  <p className={`text-sm ${isDarkMode ? 'text-rose-300' : 'text-rose-600'}`}>{authError}</p>
                )}
                <button
                  type="submit"
                  disabled={magicLoading}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-60' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-60'}`}
                >
                  {magicLoading ? 'Sending magic link...' : 'Send magic link'}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">We&apos;ll email you a secure, password-free login link (magic link).</p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 relative ${pageBgClass}`}>
      {/* Header */}
      <header className="max-w-4xl mx-auto bg-slate-900/80 backdrop-blur-md border border-slate-800 border-l-4 border-l-amber-500 rounded-2xl p-5 mb-8 shadow-xl relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
            <p className={`text-sm ${secondaryTextClass}`}>Digital Garage & Service Tracker</p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className={`p-1 rounded-full transition-all overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
              aria-label="User options"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-2">
                  <User size={18} />
                </div>
              )}
            </button>
            {isUserMenuOpen && (
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-xl z-1000 ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white border border-slate-200 text-slate-900'}`}>
                <div className="p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">User Options</div>
                  <button
                    type="button"
                    onClick={() => {
                      setUnitSystem((prev) => prev === 'imperial' ? 'metric' : 'imperial');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-50'}`}
                  >
                    {unitSystem === 'imperial' ? 'Switch to Metric (km)' : 'Switch to Imperial (mi)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDarkMode((prev) => !prev);
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-50'}`}
                  >
                    {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </button>
                  <div className="border-t border-slate-800 my-2" />
                  <form action={logout}>
                    <button
                      type="submit"
                      className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg p-2 text-xs font-medium w-full flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsGarageOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 hover:border-slate-700 transition-all text-xs font-semibold"
            >
              <BikeIcon size={14} className="text-amber-500" />
              {activeBike ? (
                <>
                  <span className="max-w-[180px] truncate">{activeBike.make} {activeBike.model}</span>
                  <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md">{activeBike.year}</span>
                </>
              ) : (
                <span>No bikes in garage</span>
              )}
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${isGarageOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isGarageOpen && (
              <div className="absolute z-30 left-0 top-full mt-2 w-[26rem] max-w-[calc(100vw-3rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-850">
                <div className="max-h-72 overflow-y-auto">
                  {bikes.length > 0 ? (
                    bikes.map((bike) => {
                      const isSelected = bike.id === selectedBikeId;

                      return (
                        <div
                          key={bike.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedBikeId(bike.id);
                            setIsGarageOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedBikeId(bike.id);
                              setIsGarageOpen(false);
                            }
                          }}
                          className={`w-full px-3 py-2.5 text-left transition-colors cursor-pointer ${isSelected ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'hover:bg-slate-800/80 border-l-2 border-transparent'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500"><BikeIcon size={14} /></span>
                            <span className="text-sm text-slate-100 truncate">{bike.make} {bike.model}</span>
                            <span className="text-[11px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded shrink-0">{bike.year}</span>
                            <span className="text-xs font-mono text-slate-400 ml-auto shrink-0">{formatDistance(bike.current_mileage)}</span>
                            <span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBike(bike.id, `${bike.year} ${bike.make} ${bike.model}`, e);
                                }}
                                className="p-1.5 rounded-md border border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                                title="Remove Bike"
                              >
                                <Trash2 size={13} />
                              </button>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-4 text-sm text-slate-400">Your garage is empty.</div>
                  )}
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(true);
                      setIsGarageOpen(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700 text-slate-100 hover:border-amber-500/50 transition-all"
                  >
                    <Plus size={15} className="text-amber-500" /> + Add Bike
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <Gauge size={14} className="text-amber-500" />
            <span className="font-mono font-bold text-slate-100">
              {activeBike ? formatDistance(activeBike.current_mileage) : '--'}
            </span>

            {!isUpdating ? (
              <button
                type="button"
                onClick={() => {
                  if (!activeBike) return;
                  setMileageInput(activeBike.current_mileage.toString());
                  setIsUpdating(true);
                }}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg transition-colors"
              >
                Update
              </button>
            ) : (
              <form onSubmit={handleMileageUpdate} className="inline-flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mileageInput}
                  onChange={(e) => setMileageInput(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  className={`w-24 text-xs py-1 px-2 rounded-lg font-mono focus:outline-none focus:border-amber-500 ${isDarkMode ? 'bg-slate-950 border border-slate-700 text-slate-100' : 'bg-slate-100 border border-slate-300 text-slate-900'}`}
                  placeholder={`New ${unitLabel}`}
                  autoFocus
                />
                <button type="submit" className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors">
                  <Check size={11} /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsUpdating(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  <X size={11} /> Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid gap-6">

        {activeBike ? (
          <>
            {/* Maintenance Status List */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Maintenance Checklist</h2>
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:border-amber-500/60"
                >
                  <Plus size={14} className="text-amber-500" />
                  + Add Task
                </button>
              </div>
              {taskErrors.length > 0 && (
                <div className="space-y-2 mb-4">
                  {taskErrors.map((error, index) => (
                    <div key={index} className={`rounded-2xl border px-4 py-3 flex items-start justify-between gap-4 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-100' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                      <div className="text-sm leading-snug">{error}</div>
                      <button
                        type="button"
                        onClick={() => handleDismissTaskError(index)}
                        className={`rounded-full p-1 ${isDarkMode ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        aria-label="Dismiss error"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-3">
                {activeTasks.length > 0 ? (
                  activeTasks.map((task) => {
                    const milesRemaining = task.interval_mileage - (activeBike.current_mileage - task.last_performed_mileage);

                    // Time-based calculation: convert months to days (approximate 1 month = 30 days)
                    const intervalMonths = task.interval_months || 0;
                    const intervalDays = intervalMonths > 0 ? intervalMonths * 30 : 0;
                    let daysRemaining: number | null = null;
                    if (task.last_performed_date && intervalDays > 0) {
                      const lastDate = new Date(task.last_performed_date);
                      if (!Number.isNaN(lastDate.getTime())) {
                        const nextDue = new Date(lastDate);
                        nextDue.setDate(nextDue.getDate() + intervalDays);
                        daysRemaining = Math.ceil((nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      }
                    }

                    // Normalize remaining ratios so we can pick the closer trigger
                    const milesRatio = task.interval_mileage > 0 ? Math.abs(milesRemaining) / task.interval_mileage : Number.POSITIVE_INFINITY;
                    const hasTimeTrigger = intervalDays > 0 && daysRemaining !== null;
                    const safeDaysRemaining = daysRemaining ?? Number.POSITIVE_INFINITY;
                    const daysRatio = hasTimeTrigger ? Math.abs(safeDaysRemaining) / intervalDays : Number.POSITIVE_INFINITY;

                    const primaryTrigger = hasTimeTrigger && daysRatio < milesRatio ? 'time' : 'mileage';

                    // Status thresholds (percent of interval)
                    const warningThresholdPct = 0.25;
                    const urgentThresholdPct = 0.1;

                    let derivedStatus: 'Healthy' | 'Soon' | 'Urgent' | 'Overdue' = 'Healthy';
                    if (primaryTrigger === 'mileage') {
                      if (milesRemaining < 0) derivedStatus = 'Overdue';
                      else if (milesRemaining <= task.interval_mileage * urgentThresholdPct) derivedStatus = 'Urgent';
                      else if (milesRemaining <= task.interval_mileage * warningThresholdPct) derivedStatus = 'Soon';
                    } else if (daysRemaining !== null) {
                      if (safeDaysRemaining < 0) derivedStatus = 'Overdue';
                      else if (safeDaysRemaining <= intervalDays * urgentThresholdPct) derivedStatus = 'Urgent';
                      else if (safeDaysRemaining <= intervalDays * warningThresholdPct) derivedStatus = 'Soon';
                    }

                    // Badge text depends on which trigger is closer
                    const badgeText = primaryTrigger === 'time' && daysRemaining !== null
                      ? (safeDaysRemaining < 0 ? 'Overdue (Time)' : `${safeDaysRemaining} days left`)
                      : (milesRemaining < 0 ? 'Overdue (Mileage)' : formatDistance(milesRemaining));

                    const displayMileageInterval = Math.round(convertDistance(task.interval_mileage));

                    return (
                      <div key={task.id} className={`${softCardClass} rounded-xl p-4 flex items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3">
                          {derivedStatus === 'Overdue' || derivedStatus === 'Urgent' ? (
                            <div className="text-rose-500 bg-rose-500/10 p-2 rounded-lg"><AlertTriangle size={18} /></div>
                          ) : derivedStatus === 'Soon' ? (
                            <div className="text-amber-500 bg-amber-500/10 p-2 rounded-lg"><Clock size={18} /></div>
                          ) : (
                            <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg"><CheckCircle size={18} /></div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm md:text-base">{task.task_name}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Wrench size={12} /> {task.is_diy ? 'Self-Maintain' : 'Shop Service'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            derivedStatus === 'Overdue' || derivedStatus === 'Urgent' ? 'bg-rose-500/10 text-rose-400' :
                            derivedStatus === 'Soon' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {badgeText}
                          </span>
                          <div className={`flex items-center gap-1 text-[10px] ${secondaryTextClass}`}>
                            <span>Every</span>
                            {editingTaskId === task.id ? (
                              <input
                                ref={mileageInputRef}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={displayMileageInterval}
                                onChange={(e) => handleIntervalMileageEdit(task.id, e.target.value)}
                                className={`w-14 rounded-md border appearance-none px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-amber-500 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                              />
                            ) : (
                              <span className="font-semibold">{displayMileageInterval}</span>
                            )}
                            <span>{unitLabel}</span>
                            <span>/</span>
                            {editingTaskId === task.id ? (
                              <input
                                ref={monthsInputRef}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={task.interval_months ?? 0}
                                onChange={(e) => handleIntervalMonthsEdit(task.id, e.target.value)}
                                className={`w-10 rounded-md border appearance-none px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-amber-500 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                              />
                            ) : (
                              <span className="font-semibold">{task.interval_months ?? 0}</span>
                            )}
                            <span>mo</span>
                            {editingTaskId === task.id && (
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => void handleSaveTaskEdit(task.id)}
                                className={`p-1 rounded hover:text-emerald-400 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenLogServiceModal(task)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${isDarkMode ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-amber-500/40 hover:text-amber-400' : 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:text-slate-900'}`}
                            >
                              Logged
                            </button>
                            <div className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 ${isDarkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-300 bg-slate-100'}`}>
                              <button
                                type="button"
                                onClick={() => handleEditTask(task.id)}
                                className="p-1 rounded hover:text-amber-400 transition-colors"
                                title={editingTaskId === task.id ? 'Stop editing' : 'Edit task intervals'}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetTaskToDefault(task.id, task.task_name)}
                                className="p-1 rounded hover:text-amber-400 transition-colors"
                                title="Reset to default"
                              >
                                <RotateCcw size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 rounded hover:text-rose-400 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-8 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                    No active maintenance plan assigned to this bike yet.
                  </div>
                )}
              </div>
            </section>

            <ServiceHistoryView
              motorcycleId={activeBike.id}
              refreshKey={historyRefreshKey}
              onAddLog={() => handleOpenLogServiceModal(null)}
              canAddLog={Boolean(activeBike)}
            />
          </>
        ) : (
          <div className="text-center py-16 bg-slate-900/10 rounded-2xl border border-slate-900 text-slate-500 text-sm">
            Select or add a vehicle above to monitor specific odometer maintenance targets.
          </div>
        )}
      </main>

      <AddCustomTaskModal
        isOpen={isAddTaskModalOpen}
        motorcycleId={activeBike?.id ?? null}
        currentOdometer={activeBike?.current_mileage ?? 0}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={async () => {
          if (!selectedBikeId) return;
          await fetchTasksForMotorcycle(selectedBikeId);
        }}
        onError={(message) => setTaskErrors((prev) => [...prev, message])}
      />

      <LogServiceModal
        isOpen={isLogServiceModalOpen}
        taskName={taskToLog?.task_name ?? 'Maintenance Task'}
        tasks={activeTasks.map((task) => ({ id: task.id, taskName: task.task_name }))}
        initialTaskId={taskToLog?.id ?? activeTasks[0]?.id ?? null}
        lockTaskSelection={Boolean(taskToLog)}
        defaultDate={new Date().toISOString().split('T')[0]}
        defaultOdometer={activeBike?.current_mileage ?? 0}
        onClose={handleCloseLogServiceModal}
        onSubmit={async (values) => {
          const error = await handleTaskLogged(values);
          if (error) return error;

          handleCloseLogServiceModal();
          return null;
        }}
      />

      {/* Add Bike Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-1">Add Motorcycle</h2>
            <p className="text-xs text-slate-400 mb-6">Park a new machine in your digital garage setup.</p>

            <form onSubmit={handleAddBikeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Year</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    required
                    value={newBike.year}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 appearance-none"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Make / Manufacturer</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    required
                    value={newBike.make || ''}
                    onChange={(e) => handleMakeChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 appearance-none disabled:opacity-60"
                  >
                    <option value="">Select a make</option>
                    {availableMakes.map((make) => (
                      <option key={make} value={make}>
                        {make === 'Other' ? 'Other / Not Listed' : make}
                      </option>
                    ))}
                  </select>
                </div>
                {showCustomMakeInput && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom make name"
                    value={customMakeName}
                    onChange={(e) => setCustomMakeName(e.target.value)}
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Model Name</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    required
                    value={newBike.model || ''}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 appearance-none disabled:opacity-60"
                    disabled={!newBike.make || newBike.make === 'other'}
                  >
                    <option value="">{!newBike.make ? 'Select a make first' : 'Select a model'}</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model === 'Other' ? 'Other / Not Listed' : model}
                      </option>
                    ))}
                  </select>
                </div>
                {showCustomModelInput && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom model name"
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Current Odometer Reading (mi)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  placeholder="0"
                  value={newBike.current_mileage}
                  onChange={e => setNewBike({...newBike, current_mileage: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-750 font-semibold py-2.5 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingBike}
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 disabled:opacity-70 disabled:cursor-not-allowed text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10"
                >
                  {isSavingBike ? 'Saving…' : 'Add to Garage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}