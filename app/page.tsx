'use client';

import React, { useEffect, useState } from 'react';
import { mockBikes, mockTasks, Bike, MaintenanceTask } from './mockData';
import { bikeDatabase } from './bikeDatabase';
import { Bike as BikeIcon, Gauge, Plus, Wrench, AlertTriangle, CheckCircle, Clock, X, Trash2, ChevronDown, User, RotateCcw, Pencil, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signInWithGoogle, signInWithApple, logout } from '@/lib/actions/auth';

export default function GarageDashboard() {
  const [bikes, setBikes] = useState<Bike[]>(mockBikes);
  const [tasks, setTasks] = useState<MaintenanceTask[]>(mockTasks);
  const [selectedBikeId, setSelectedBikeId] = useState<string>(mockBikes[0]?.id || '');
  const [mileageInput, setMileageInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = React.useMemo(() => createClient(), []);

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
    year: new Date().getFullYear(),
    make: '',
    model: '',
    current_mileage: ''
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(data?.session?.user ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
    } finally {
      setLoading(false);
      setIsUserMenuOpen(false);
    }
  };
  const [customModelName, setCustomModelName] = useState<string>('');
  const [customTask, setCustomTask] = useState({
    name: '',
    intervalMileage: '',
    intervalMonths: ''
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState<boolean>(false);
  const [taskErrors, setTaskErrors] = useState<string[]>([]);
  const mileageInputRef = React.useRef<HTMLInputElement | null>(null);
  const monthsInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeBike = bikes.find(b => b.id === selectedBikeId);
  const activeTasks = tasks.filter(t => t.bike_id === selectedBikeId);
  const availableYears = Object.keys(bikeDatabase)
    .map(Number)
    .sort((a, b) => b - a);
  const availableMakes = Object.keys(bikeDatabase[newBike.year] || {});
  const availableModels = newBike.make
    ? (bikeDatabase[newBike.year]?.[newBike.make] || []).map((model) => model.name)
    : [];

  const handleMileageUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const newMileage = parseDistanceInput(mileageInput);
    if (isNaN(newMileage) || newMileage <= 0) return;

    setBikes(prevBikes =>
      prevBikes.map(b =>
        b.id === selectedBikeId ? { ...b, current_mileage: Math.round(newMileage) } : b
      )
    );
    setMileageInput('');
    setIsUpdating(false);
  };

  const handleYearChange = (value: string) => {
    setNewBike((prev) => ({
      ...prev,
      year: Number(value),
      make: '',
      model: '',
      current_mileage: prev.current_mileage
    }));
    setCustomModelName('');
  };

  const handleMakeChange = (value: string) => {
    setNewBike((prev) => ({
      ...prev,
      make: value,
      model: '',
      current_mileage: prev.current_mileage
    }));
    setCustomModelName('');
  };

  const handleModelChange = (value: string) => {
    setNewBike((prev) => ({
      ...prev,
      model: value,
      current_mileage: prev.current_mileage
    }));
    if (value !== 'custom') {
      setCustomModelName('');
    }
  };

  const handleAddBikeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBike.make || !newBike.model || !newBike.current_mileage) return;

    const selectedModelName = newBike.model === 'custom' ? customModelName.trim() : newBike.model;
    if (!selectedModelName) return;

    const newlyCreatedBike: Bike = {
      id: `bike-${Date.now()}`,
      year: Number(newBike.year),
      make: newBike.make,
      model: selectedModelName,
      current_mileage: parseInt(newBike.current_mileage) || 0
    };

    const selectedModelData = bikeDatabase[newBike.year]?.[newBike.make]?.find((model) => model.name === selectedModelName);
    const defaultTasks: MaintenanceTask[] = (selectedModelData?.tasks || []).map((task, index) => ({
      id: `task-${Date.now()}-${index}`,
      bike_id: newlyCreatedBike.id,
      task_name: task.task_name,
      interval_mileage: task.interval_mileage,
      last_performed_mileage: newlyCreatedBike.current_mileage,
      last_performed_date: new Date().toISOString().split('T')[0],
      interval_months: (task as any).interval_months || 0,
      is_diy: task.is_diy,
      status: 'Healthy'
    }));

    setBikes(prev => [...prev, newlyCreatedBike]);
    setTasks(prev => [...prev, ...defaultTasks]);
    setSelectedBikeId(newlyCreatedBike.id);
    
    setNewBike({
      year: new Date().getFullYear(),
      make: '',
      model: '',
      current_mileage: ''
    });
    setCustomModelName('');
    setIsModalOpen(false);
  };

  const handleRemoveBike = (bikeId: string, bikeName: string, e: React.MouseEvent) => {
    // Prevent the click from selecting the bike card underneath
    e.stopPropagation();

    const confirmed = window.confirm(`Are you sure you want to remove the ${bikeName} from your garage? This will clear all tracking data.`);
    if (!confirmed) return;

    const updatedBikes = bikes.filter(b => b.id !== bikeId);
    setBikes(updatedBikes);
    setTasks(prev => prev.filter(task => task.bike_id !== bikeId));

    // If we just deleted the bike we were looking at, shift focus to the first available bike
    if (selectedBikeId === bikeId) {
      setSelectedBikeId(updatedBikes[0]?.id || '');
    }
  };

  const handleTaskLogged = (taskId: string) => {
    if (!activeBike) return;

    const today = new Date().toISOString().split('T')[0];

    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, last_performed_mileage: activeBike.current_mileage, last_performed_date: today }
        : task
    ));
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId((prev) => (prev === taskId ? null : taskId));
    if (typeof document !== 'undefined') {
      document.activeElement instanceof HTMLElement && document.activeElement.blur();
    }
  };

const handleSaveTaskEdit = () => {
    // Force the browser to explicitly drop focus from whatever field is currently blinking
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditingTaskId(null);
  };
  
  const handleDismissTaskError = (index: number) => {
    setTaskErrors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleResetTaskToDefault = (taskId: string, taskName: string) => {
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

    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? {
            ...task,
            interval_mileage: defaultTask.interval_mileage,
            interval_months: (defaultTask as any).interval_months || 0
          }
        : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
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

  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBike) return;

    const taskName = customTask.name.trim();
    const intervalMileage = Number(customTask.intervalMileage);
    const intervalMonths = Number(customTask.intervalMonths);

    if (!taskName || Number.isNaN(intervalMileage) || intervalMileage <= 0) return;

    const today = new Date().toISOString().split('T')[0];

    setTasks(prev => [
      ...prev,
      {
        id: `task-${Date.now()}`,
        bike_id: activeBike.id,
        task_name: taskName,
        interval_mileage: Math.max(0, Math.round(intervalMileage)),
        last_performed_mileage: activeBike.current_mileage,
        last_performed_date: today,
        interval_months: Number.isNaN(intervalMonths) ? 0 : Math.max(0, Math.round(intervalMonths)),
        is_diy: true,
        status: 'Healthy' as const
      }
    ]);

    setCustomTask({ name: '', intervalMileage: '', intervalMonths: '' });
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
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={handleAppleLogin}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
            >
              Sign in with Apple
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 relative ${pageBgClass}`}>
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
          <p className={`text-sm ${secondaryTextClass}`}>Digital Garage & Service Tracker</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className={`p-3 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
            aria-label="User options"
          >
            <User size={18} />
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
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid gap-6">
        {/* Selected Bike - Sticky Display */}
        {activeBike && (
          <div className="sticky top-4 z-20">
            <div className={`w-full p-5 rounded-2xl border text-left transition-all relative group ${selectedCardBgClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-800/60 rounded-xl text-amber-500">
                    <BikeIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg leading-tight truncate">{activeBike.make}</h3>
                    <p className="text-slate-400 text-sm truncate">{activeBike.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded-md">
                    {activeBike.year}
                  </span>
                  <button
                    onClick={(e) => handleRemoveBike(activeBike.id, `${activeBike.year} ${activeBike.make} ${activeBike.model}`, e)}
                    className="p-1.5 bg-slate-950/80 border border-slate-800/80 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 rounded-lg transition-all"
                    title="Remove Bike"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className={`mt-4 flex items-center gap-2 text-sm font-mono p-2 rounded-lg ${isDarkMode ? 'text-slate-300 bg-black/30' : 'text-slate-700 bg-slate-100'}`}>
                <Gauge size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-500'} />
                <span>{formatDistance(activeBike.current_mileage)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Garage Slider/Selector */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Your Garage</h2>
          {bikes.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {bikes.map((bike) => {
                const isSelected = bike.id === selectedBikeId;
                // Skip rendering selected bike here - it's shown sticky above
                if (isSelected) return null;
                
                return (
                  <div
                    key={bike.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBikeId(bike.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedBikeId(bike.id);
                      }
                    }}
                    className={`w-full p-5 rounded-2xl border text-left transition-all relative group ${cardBgClass}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-800/60 rounded-xl text-amber-500">
                          <BikeIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg leading-tight truncate">{bike.make}</h3>
                          <p className="text-slate-400 text-sm truncate">{bike.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded-md">
                          {bike.year}
                        </span>
                        <button
                          onClick={(e) => handleRemoveBike(bike.id, `${bike.year} ${bike.make} ${bike.model}`, e)}
                          className="p-1.5 bg-slate-950/80 border border-slate-800/80 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                          title="Remove Bike"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-mono p-2 rounded-lg ${isDarkMode ? 'text-slate-300 bg-black/30' : 'text-slate-700 bg-slate-100'}`}>
                      <Gauge size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-500'} />
                      <span>{formatDistance(bike.current_mileage)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center p-12 rounded-2xl text-sm ${isDarkMode ? 'bg-slate-900/20 border border-dashed border-slate-800 text-slate-400' : 'bg-white border border-dashed border-slate-200 text-slate-600'}`}>
              <BikeIcon size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="font-medium mb-1">Your garage is empty</p>
              <p className="text-xs text-slate-500 mb-4">Use the button below to park your first motorcycle.</p>
            </div>
          )}
          <div className="mt-4 flex justify-start">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDarkMode ? 'bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-50' : 'bg-slate-100 border border-slate-200 text-slate-900 hover:border-slate-300'}`}
            >
              <Plus size={16} className="text-amber-500" /> Add Bike
            </button>
          </div>
        </section>

        {activeBike ? (
          <>
            {/* Quick Mileage Update Widget */}
            <section className={`${sectionCardClass} rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Gauge size={22} />
                </div>
                <div>
                  <h3 className={`font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>Odometer Check</h3>
                  <p className={`text-xs ${secondaryTextClass}`}>Keep intervals accurate by logging your latest mileage.</p>
                </div>
              </div>

              {!isUpdating ? (
                <button
                  onClick={() => {
                    setMileageInput(activeBike.current_mileage.toString());
                    setIsUpdating(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold px-5 py-2.5 rounded-xl transition-all text-center"
                >
                  Update Mileage
                </button>
              ) : (
                <form onSubmit={handleMileageUpdate} className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={mileageInput}
                    onChange={(e) => setMileageInput(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onClick={(e) => e.currentTarget.select()}
                    className={`rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500 w-full md:w-32 ${isDarkMode ? 'bg-slate-950 border border-slate-700 text-slate-100' : 'bg-slate-100 border border-slate-300 text-slate-900'}`}
                    placeholder={`New ${unitLabel}`}
                    autoFocus
                  />
                  <button type="submit" className="bg-amber-500 text-slate-950 text-sm font-bold px-4 py-2 rounded-xl">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUpdating(false)}
                    className="bg-slate-800 text-slate-400 text-sm px-3 py-2 rounded-xl hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </section>

            {/* Maintenance Status List */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Maintenance Checklist</h2>
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
                    const intervalDays = intervalMonths * 30;
                    let daysRemaining = Number.POSITIVE_INFINITY;
                    if (task.last_performed_date && intervalDays > 0) {
                      const lastDate = new Date(task.last_performed_date);
                      const nextDue = new Date(lastDate);
                      nextDue.setDate(nextDue.getDate() + intervalDays);
                      daysRemaining = Math.ceil((nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    } else if (intervalDays > 0) {
                      daysRemaining = intervalDays; // fallback if no last date
                    }

                    // Normalize remaining ratios so we can pick the closer trigger
                    const milesRatio = task.interval_mileage > 0 ? Math.abs(milesRemaining) / task.interval_mileage : Number.POSITIVE_INFINITY;
                    const daysRatio = intervalDays > 0 ? Math.abs(daysRemaining) / intervalDays : Number.POSITIVE_INFINITY;

                    const primaryTrigger = milesRatio <= daysRatio ? 'mileage' : 'time';

                    // Status thresholds (percent of interval)
                    const warningThresholdPct = 0.25;
                    const urgentThresholdPct = 0.1;

                    let derivedStatus: 'Healthy' | 'Soon' | 'Urgent' | 'Overdue' = 'Healthy';
                    if (primaryTrigger === 'mileage') {
                      if (milesRemaining < 0) derivedStatus = 'Overdue';
                      else if (milesRemaining <= task.interval_mileage * urgentThresholdPct) derivedStatus = 'Urgent';
                      else if (milesRemaining <= task.interval_mileage * warningThresholdPct) derivedStatus = 'Soon';
                    } else {
                      if (daysRemaining < 0) derivedStatus = 'Overdue';
                      else if (daysRemaining <= intervalDays * urgentThresholdPct) derivedStatus = 'Urgent';
                      else if (daysRemaining <= intervalDays * warningThresholdPct) derivedStatus = 'Soon';
                    }

                    // Badge text depends on which trigger is closer
                    const badgeText = primaryTrigger === 'time'
                      ? (daysRemaining < 0 ? 'Overdue (Time)' : `${daysRemaining} days left`)
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
                                onClick={handleSaveTaskEdit}
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
                              onClick={() => handleTaskLogged(task.id)}
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
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsAddTaskFormOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
                  >
                    <Plus size={16} className="text-amber-500" />
                    {isAddTaskFormOpen ? 'Hide task form' : 'Add a task'}
                  </button>

                  {isAddTaskFormOpen && (
                    <form onSubmit={handleAddCustomTask} className={`flex flex-col gap-2 rounded-xl border p-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={customTask.name}
                          onChange={(e) => setCustomTask(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Task name"
                          className={`flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={customTask.intervalMileage}
                          onChange={(e) => setCustomTask(prev => ({ ...prev, intervalMileage: e.target.value }))}
                          placeholder={`Interval ${unitLabel}`}
                          className={`w-full sm:w-32 rounded-xl border appearance-none px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={customTask.intervalMonths}
                          onChange={(e) => setCustomTask(prev => ({ ...prev, intervalMonths: e.target.value }))}
                          placeholder="Months"
                          className={`w-full sm:w-24 rounded-xl border appearance-none px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                        />
                        <button
                          type="submit"
                          className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
                        >
                          <Plus size={16} className="text-amber-500" />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="text-center py-16 bg-slate-900/10 rounded-2xl border border-slate-900 text-slate-500 text-sm">
            Select or add a vehicle above to monitor specific odometer maintenance targets.
          </div>
        )}
      </main>

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
                    value={newBike.make}
                    onChange={(e) => handleMakeChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 appearance-none"
                  >
                    <option value="">Select a make</option>
                    {availableMakes.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Model Name</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    required
                    value={newBike.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 appearance-none disabled:opacity-60"
                    disabled={!newBike.make}
                  >
                    <option value="">Select a model</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                    <option value="custom">Custom / Not Listed</option>
                  </select>
                </div>
                {newBike.model === 'custom' && (
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
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10"
                >
                  Add to Garage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}