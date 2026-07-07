'use client';

import React, { useState } from 'react';
import { mockBikes, mockTasks, Bike, MaintenanceTask } from './mockData';
import { bikeDatabase } from './bikeDatabase';
import { Bike as BikeIcon, Gauge, Plus, Wrench, AlertTriangle, CheckCircle, Clock, X, Trash2, ChevronDown } from 'lucide-react';

export default function GarageDashboard() {
  const [bikes, setBikes] = useState<Bike[]>(mockBikes);
  const [tasks, setTasks] = useState<MaintenanceTask[]>(mockTasks);
  const [selectedBikeId, setSelectedBikeId] = useState<string>(mockBikes[0]?.id || '');
  const [mileageInput, setMileageInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  
  // Modal states for adding a bike
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newBike, setNewBike] = useState({
    year: new Date().getFullYear(),
    make: '',
    model: '',
    current_mileage: ''
  });
  const [customModelName, setCustomModelName] = useState<string>('');

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
    const newMileage = parseInt(mileageInput);
    if (isNaN(newMileage) || newMileage <= 0) return;

    setBikes(prevBikes =>
      prevBikes.map(b =>
        b.id === selectedBikeId ? { ...b, current_mileage: newMileage } : b
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 relative">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
          <p className="text-sm text-slate-400">Digital Garage & Service Tracker</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-amber-500/50 px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          <Plus size={16} className="text-amber-500" /> Add Bike
        </button>
      </header>

      <main className="max-w-4xl mx-auto grid gap-6">
        {/* Garage Slider/Selector */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Your Garage</h2>
          {bikes.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {bikes.map((bike) => {
                const isSelected = bike.id === selectedBikeId;
                return (
                  <button
                    key={bike.id}
                    onClick={() => setSelectedBikeId(bike.id)}
                    className={`flex-shrink-0 w-64 p-5 rounded-2xl border text-left transition-all relative group ${
                      isSelected
                        ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-amber-500 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-800/60 rounded-xl text-amber-500">
                        <BikeIcon size={20} />
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
                    <h3 className="font-bold text-lg leading-tight truncate pr-4">{bike.make}</h3>
                    <p className="text-slate-400 text-sm mb-4 truncate pr-4">{bike.model}</p>
                    <div className="flex items-center gap-2 text-slate-300 text-sm font-mono bg-black/30 p-2 rounded-lg">
                      <Gauge size={14} className="text-slate-500" />
                      <span>{bike.current_mileage.toLocaleString()} mi</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-slate-400">
              <BikeIcon size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="font-medium mb-1">Your garage is empty</p>
              <p className="text-xs text-slate-500 mb-4">Click "Add Bike" above to park your first motorcycle.</p>
            </div>
          )}
        </section>

        {activeBike ? (
          <>
            {/* Quick Mileage Update Widget */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Gauge size={22} />
                </div>
                <div>
                  <h3 className="font-bold">Odometer Check</h3>
                  <p className="text-xs text-slate-400">Keep intervals accurate by logging your latest mileage.</p>
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
                    type="number"
                    value={mileageInput}
                    onChange={(e) => setMileageInput(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500 w-full md:w-32"
                    placeholder="New mi"
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
              <div className="grid gap-3">
                {activeTasks.length > 0 ? (
                  activeTasks.map((task) => {
                    const milesRemaining = task.interval_mileage - (activeBike.current_mileage - task.last_performed_mileage);
                    const warningThreshold = task.interval_mileage * 0.25;
                    const urgentThreshold = task.interval_mileage * 0.1;
                    const derivedStatus = milesRemaining < 0
                      ? 'Overdue'
                      : milesRemaining <= urgentThreshold
                        ? 'Urgent'
                        : milesRemaining <= warningThreshold
                          ? 'Soon'
                          : 'Healthy';

                    return (
                      <div key={task.id} className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4">
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

                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            derivedStatus === 'Overdue' || derivedStatus === 'Urgent' ? 'bg-rose-500/10 text-rose-400' :
                            derivedStatus === 'Soon' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {derivedStatus === 'Overdue' ? 'Overdue' : derivedStatus === 'Urgent' ? 'Urgent' : `${milesRemaining.toLocaleString()} mi left`}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">Every {task.interval_mileage.toLocaleString()} mi</p>
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