import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BatteryCharging, Zap, RefreshCw, Calendar, Clock, TrendingUp, Sun, Power, Minus, Plus } from 'lucide-react'; 
import './App.css';
import FluidBackground from './components/FluidBackground'; 

interface AverageGeneration {
  [fuel: string]: number;
}

interface EnergyMixDto {
  date: string;
  averageGeneration: AverageGeneration;
  cleanEnergyPercentage: number;
}

interface OptimalChargingWindow {
  startDate: string;
  endDate: string;
  averageCleanEnergyPercentage: number;
}

const API_BASE_URL = 'https://energy-optimizer-backend-w9lq.onrender.com'; 

const FUEL_COLORS: { [key: string]: string } = {
  biomass: '#4ade80', 
  nuclear: '#60a5fa', 
  hydro: '#22d3ee', 
  wind: '#c084fc', 
  solar: '#facc15', 
  gas: '#fb923c', 
  coal: '#64748b', 
  oil: '#ef4444', 
  imports: '#94a3b8', 
  other: '#a855f7', 
};

const formatChartData = (averageGeneration: AverageGeneration) => {
  return Object.keys(averageGeneration).map(fuel => ({
    name: fuel.charAt(0).toUpperCase() + fuel.slice(1),
    value: averageGeneration[fuel],
    color: FUEL_COLORS[fuel] || FUEL_COLORS.other,
  }));
};

const EnergyPieChart: React.FC<{ mix: EnergyMixDto }> = ({ mix }) => {
  const chartData = useMemo(() => formatChartData(mix.averageGeneration), [mix.averageGeneration]);

  return (
    <div className="energy-chart-card glass-card">
      <h3 className="chart-title">
        <Sun className="icon chart-icon" />
        Miks dla {new Date(mix.date).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </h3>
      
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={250} className="pie-chart-container"> 
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60} 
              outerRadius={100}
              labelLine={false}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                    border: '1px solid #475569', 
                    borderRadius: '8px', 
                    color: '#e2e8f0',
                    fontSize: '0.875rem'
                }}
                formatter={(value: any, name: any) => {
                    const displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
                    return [`Udział: ${displayValue}%`, name as string];
                }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="clean-energy-info">
        <Zap className="icon" />
        Czysta energia: <span>{mix.cleanEnergyPercentage}%</span>
      </div>

      <Legend
        layout="horizontal"
        verticalAlign="bottom"
        align="center"
        wrapperStyle={{ paddingTop: '16px', color: '#e2e8f0' }} 
        {...{payload: chartData.map(entry => ({
            value: entry.name,
            type: 'square',
            id: entry.name,
            color: entry.color,
        })) as any}}
      />
    </div>
  );
};

const ChargingWindowForm: React.FC<{ 
    setOptimalWindow: (window: OptimalChargingWindow | null) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}> = ({ setOptimalWindow, setIsLoading, setError }) => {
  const [duration, setDuration] = useState<number>(3);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setOptimalWindow(null);
    setError(null);

    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
        try {
            const response = await fetch(`${API_BASE_URL}/optimal-charge?durationHours=${duration}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Błąd serwera: ${response.status}`);
            }

            const data: OptimalChargingWindow = await response.json();
            setOptimalWindow(data);
            setIsLoading(false);
            return;

        } catch (err: any) {
            currentRetry++;
            if (currentRetry >= maxRetries) {
                console.error("Błąd ładowania okna po ponownych próbach:", err);
                setError(`Nie udało się obliczyć okna: ${err.message}. Spróbuj ponownie.`);
                setIsLoading(false);
                return;
            }
            const delay = Math.pow(2, currentRetry - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
  }, [duration, setOptimalWindow, setIsLoading, setError]);

  return (
    <div className="charging-form-card glass-card">
      <h2 className="form-title">
        <BatteryCharging className="icon form-icon" />
        Optymalne Ładowanie EV
      </h2>
      <p className="form-description">
        Wybierz, jak długo ma trwać ładowanie (w godzinach), aby znaleźć najbardziej ekologiczny czas w ciągu najbliższych dwóch dni.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div className="flex flex-col">
          <label htmlFor="duration" className="form-label">
            Długość ładowania (1-6 godzin):
          </label>
          <div className="duration-control-group">
            <button 
              type="button" 
              onClick={() => setDuration(Math.max(1, duration - 1))} 
              className="duration-btn"
              disabled={duration <= 1}
            >
              <Minus size={20} />
            </button>
            <div className="duration-display-wrapper">
              <input
                id="duration"
                type="number"
                min="1"
                max="6"
                value={duration}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setDuration(Math.min(6, Math.max(1, val)));
                }}
                required
                className="form-input duration-input-centered"
              />
              <span className="duration-unit">h</span>
            </div>
            <button 
              type="button" 
              onClick={() => setDuration(Math.min(6, duration + 1))} 
              className="duration-btn"
              disabled={duration >= 6}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={duration < 1 || duration > 6}
          className="submit-button group"
        >
          <TrendingUp className="icon button-icon group-hover:rotate-12 transition-transform duration-300" /> 
          Znajdź Najlepsze Okno
        </button>
      </form>
    </div>
  );
};

const OptimalWindowResult: React.FC<{ 
    window: OptimalChargingWindow | null; 
    isLoading: boolean;
    error: string | null;
}> = ({ window, isLoading, error }) => {
    
    if (isLoading) {
        return (
            <div className="loading-state glass-card">
                <RefreshCw className="icon animate-spin loading-icon-mix" /> 
                <span className="loading-text-mix">Obliczam optymalne okno... Proszę czekać.</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-message error glass-card">
                <p className="font-bold">Błąd:</p>
                <p>{error}</p>
            </div>
        );
    }

    if (!window) {
        return (
            <div className="result-message info glass-card">
                Wprowadź długość ładowania (1-6h) i kliknij "Znajdź Najlepsze Okno".
            </div>
        );
    }

    const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      return {
        date: date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      };
    };

    const start = formatDateTime(window.startDate);
    const end = formatDateTime(window.endDate);

    return (
        <div className="result-window glass-card">
            <h3 className="result-title">
                <Power className="icon" />
                Najlepszy Czas na Ładowanie
            </h3>
            <div className="result-grid">
                <div className="result-item result-start">
                    <p className="result-label">Rozpoczęcie ładowania:</p>
                    <p className="result-value">
                        <Calendar className="icon" />
                        {start.date}
                    </p>
                    <p className="result-value">
                        <Clock className="icon" />
                        {start.time} (UTC)
                    </p>
                </div>
                <div className="result-item result-end">
                    <p className="result-label">Zakończenie ładowania:</p>
                    <p className="result-value">
                        <Calendar className="icon" />
                        {end.date}
                    </p>
                    <p className="result-value">
                        <Clock className="icon" />
                        {end.time} (UTC)
                    </p>
                </div>
                <div className="result-item result-percent">
                    <p className="result-label">Średni % Czystej Energii w Oknie:</p>
                    <p className="result-percent-value">
                        {window.averageCleanEnergyPercentage.toFixed(2)}%
                    </p>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [dailyMixes, setDailyMixes] = useState<EnergyMixDto[]>([]);
  const [isMixLoading, setIsMixLoading] = useState(true);
  const [mixError, setMixError] = useState<string | null>(null);

  const [optimalWindow, setOptimalWindow] = useState<OptimalChargingWindow | null>(null);
  const [isWindowLoading, setIsWindowLoading] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);
  

  const fetchDailyMix = useCallback(async () => {
    setIsMixLoading(true);
    setMixError(null);
    
    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
        try {
            const response = await fetch(`${API_BASE_URL}/daily-mix`);
            if (!response.ok) {
                throw new Error(`Błąd serwera: ${response.status}`);
            }
            const data: EnergyMixDto[] = await response.json();
            setDailyMixes(data);
            setIsMixLoading(false);
            return;
        } catch (error: any) {
            currentRetry++;
            if (currentRetry >= maxRetries) {
                console.error("Błąd ładowania miksu po ponownych próbach:", error);
                setMixError(`Nie udało się załadować miksu: ${error.message}. Upewnij się, że backend działa pod adresem: ${API_BASE_URL}`);
                setIsMixLoading(false);
                return;
            }
            const delay = Math.pow(2, currentRetry - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
  }, []);

  useEffect(() => {
    fetchDailyMix();
  }, [fetchDailyMix]);

  return (
    <>
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0f172a;
        }

        .glass-card {
            background-color: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(71, 85, 105, 0.4);
            border-radius: 1rem;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            color: #e2e8f0;
            padding: 1.5rem;
            transition: all 0.3s ease-in-out;
        }

        .glass-card:hover {
            box-shadow: 0 10px 40px 0 rgba(67, 56, 202, 0.2);
            border-color: rgba(129, 140, 248, 0.6);
        }
        
        .main-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem 1rem;
            position: relative;
            z-index: 10;
        }

        .app-header {
            text-align: center;
            margin-bottom: 3rem;
            max-width: 800px;
            padding: 1rem;
        }

        .app-title {
            font-size: 2.25rem;
            font-weight: 800;
            color: #a78bfa;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .header-zap {
            margin-right: 0.75rem;
            width: 1.5em;
            height: 1.5em;
        }

        .app-subtitle {
            color: #94a3b8;
            font-size: 1.125rem;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 1.5rem;
            text-align: center;
        }

        .section-mix {
            width: 100%;
            max-width: 1200px;
            margin-bottom: 3rem;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        
        .recharts-default-legend {
            color: #e2e8f0;
        }
        .pie-chart-container .recharts-surface {
            overflow: visible;
        }


        .energy-chart-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 450px;
        }
        
        .chart-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #fff;
            display: flex;
            align-items: center;
            text-align: center;
            margin-bottom: 1rem;
        }

        .chart-icon {
            width: 1.25em;
            height: 1.25em;
            margin-right: 0.5rem;
            color: #facc15;
        }
        
        .chart-wrapper {
            width: 100%;
            flex-grow: 1;
        }
        
        .clean-energy-info {
            display: flex;
            align-items: center;
            font-size: 1.25rem;
            font-weight: 700;
            color: #4ade80;
            margin-top: 1rem;
        }
        .clean-energy-info .icon {
            margin-right: 0.5rem;
        }

        .section-calculator {
            width: 100%;
            max-width: 800px;
            margin-top: 2rem;
        }

        .charging-form-card, .result-window, .loading-state, .error-message, .result-message {
            margin-top: 1.5rem;
            width: 100%;
        }

        .form-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #a78bfa;
            display: flex;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .form-icon {
            width: 1.5em;
            height: 1.5em;
            margin-right: 0.75rem;
        }
        .form-description {
            color: #94a3b8;
            margin-bottom: 1.5rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #cbd5e1;
        }

        .form-input {
            width: 100%;
            padding: 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid #475569;
            background-color: #1e293b;
            color: #e2e8f0;
            transition: border-color 0.3s;
        }
        .form-input:focus {
            border-color: #a78bfa;
            outline: none;
        }

        .submit-button {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-weight: 700;
            border-radius: 0.75rem;
            background-color: #8b5cf6;
            color: white;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(139, 92, 246, 0.4);
            cursor: pointer;
        }

        .submit-button:hover:not(:disabled) {
            background-color: #7c3aed;
            box-shadow: 0 6px 10px rgba(139, 92, 246, 0.6);
        }
        .submit-button:disabled {
            background-color: #64748b;
            cursor: not-allowed;
            box-shadow: none;
            opacity: 0.7;
        }
        .button-icon {
            width: 1.25em;
            height: 1.25em;
            margin-right: 0.5rem;
        }
        
        .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #a78bfa;
            font-weight: 600;
        }
        .loading-icon-mix {
            width: 1.5em;
            height: 1.5em;
            margin-right: 0.75rem;
        }
        .loading-text-mix {
             font-size: 1.125rem;
        }

        .error-message {
            padding: 1.5rem;
            background-color: rgba(239, 68, 68, 0.5);
            border-color: #f87171;
            color: #fecaca;
        }
        .error-message p {
            margin: 0;
        }
        .result-message.info {
            padding: 1.5rem;
            background-color: rgba(60, 204, 137, 0.5);
            border-color: #34d399;
            color: #ccfbf1;
            text-align: center;
            font-weight: 500;
        }
        
        .result-window {
            padding: 2rem;
        }
        
        .result-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: #4ade80;
            display: flex;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .result-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }
        
        @media (min-width: 640px) {
            .result-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        .result-item {
            padding: 1rem;
            border-radius: 0.5rem;
            background-color: rgba(71, 85, 105, 0.2);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        /* Nadpisanie stylów z App.css które psują układ */
        .result-percent {
            grid-column: auto !important;
            background: transparent !important;
            box-shadow: none !important;
            color: inherit !important;
            padding: 1rem !important;
        }
        
        .result-label, .result-percent .result-label {
            font-size: 0.9rem;
            color: #e2e8f0 !important;
            margin-bottom: 0.5rem;
        }
        
        .result-value {
            font-size: 1.1rem;
            font-weight: 600;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .result-value .icon {
            width: 1em;
            height: 1em;
            margin-right: 0.5rem;
            color: #a78bfa;
        }

        .result-percent-value {
            font-size: 2rem;
            font-weight: 800;
            color: #facc15;
        }
        `}
      </style>
      
      <FluidBackground />
      <div className="main-container"> 

        <header className="app-header">
          <h1 className="app-title">
            <Zap className="icon header-zap" />
            Optymalizator Ładowania EV (UK)
          </h1>
          <p className="app-subtitle">
            Analityka miksu energetycznego Wielkiej Brytanii i prognoza optymalnych okien ładowania.
          </p>
        </header>

        <section className="section-mix">
          <h2 className="section-title">
              Aktualny i Prognozowany Miks Energetyczny (Uśredniony Dziennie)
          </h2>
          {isMixLoading && (
            <div className="loading-state glass-card">
              <RefreshCw className="icon animate-spin loading-icon-mix" />
              <span className="loading-text-mix">Ładowanie danych z backendu...</span>
            </div>
          )}
          {mixError && (
            <div className="error-message glass-card">
              <p className="font-bold">Błąd krytyczny:</p>
              <p>{mixError}</p>
            </div>
          )}

          {!isMixLoading && !mixError && (
            <div className="charts-grid">
              {dailyMixes.map((mix) => (
                <EnergyPieChart key={mix.date} mix={mix} />
              ))}
            </div>
          )}
        </section>

        <section className="section-calculator">
          <h2 className="section-title">
              Obliczanie Najlepszego Okna Ładowania (Jutro + Pojutrze)
          </h2>
          <ChargingWindowForm 
              setOptimalWindow={setOptimalWindow} 
              setIsLoading={setIsWindowLoading} 
              setError={setWindowError} 
          />
          <OptimalWindowResult 
              window={optimalWindow} 
              isLoading={isWindowLoading} 
              error={windowError} 
          />
        </section>

      </div>
    </>
  );
};

export default App;