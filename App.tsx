
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, AIAnalysis } from './types';
import { CATEGORIES, Icons, CATEGORY_COLORS } from './constants';
import { GeminiService } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const gemini = new GeminiService();

type ViewMode = 'dashboard' | 'reports';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiChatInput, setAiChatInput] = useState('');

  // Filtering State for Reports
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('飲食');
  const [type, setType] = useState<TransactionType>('expense');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('smart_ledger_data');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('smart_ledger_data', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (t: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: t.date || new Date().toISOString().split('T')[0],
      amount: Number(t.amount) || 0,
      category: t.category || '其它',
      type: t.type || 'expense',
      note: t.note || '',
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm('確定要刪除這筆記錄嗎？')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({ amount: Number(amount), category, type, note, date });
    setAmount('');
    setNote('');
    setIsAdding(false);
  };

  const handleAiInput = async () => {
    if (!aiChatInput.trim()) return;
    setLoading(true);
    const result = await gemini.parseNaturalLanguage(aiChatInput);
    if (result) {
      addTransaction(result);
      setAiChatInput('');
    }
    setLoading(false);
  };

  const requestAnalysis = async () => {
    setLoading(true);
    const analysis = await gemini.analyzeSpending(transactions);
    setAiAnalysis(analysis);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const thisMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const income = thisMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = thisMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    const categoryData = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc: any[], t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      }, []);

    return { income, expense, balance, categoryData };
  }, [transactions]);

  // Report Data Calculations
  const reportStats = useMemo(() => {
    const yearStr = reportYear.toString();
    const yearTransactions = transactions.filter(t => t.date.startsWith(yearStr));

    // Group by month for Bar Chart
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0');
      const monthLabel = `${month}月`;
      const monthPrefix = `${yearStr}-${month}`;
      const monthTrans = yearTransactions.filter(t => t.date.startsWith(monthPrefix));
      
      return {
        name: monthLabel,
        income: monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      };
    });

    // Group by category for Year Pie Chart
    const yearlyCategoryData = yearTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc: any[], t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);

    const totalYearIncome = yearTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalYearExpense = yearTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return { monthlyData, yearlyCategoryData, totalYearIncome, totalYearExpense };
  }, [transactions, reportYear]);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Icons.Wallet />
            </div>
            <h1 className="font-bold text-xl text-slate-800 hidden sm:block">SmartLedger AI</h1>
          </div>
          
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              總覽
            </button>
            <button 
              onClick={() => setViewMode('reports')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'reports' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              報表
            </button>
          </nav>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
        >
          <Icons.Plus />
          <span className="hidden sm:inline font-medium">新增記錄</span>
        </button>
      </header>

      {viewMode === 'dashboard' ? (
        <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
          {/* Left Column: Summary & Quick Input */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs md:text-sm mb-1 font-medium">本月結餘</p>
                <h2 className={`text-lg md:text-2xl font-bold ${stats.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                  ${stats.balance.toLocaleString()}
                </h2>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-emerald-600 text-xs md:text-sm mb-1 font-medium">本月收入</p>
                <h2 className="text-lg md:text-2xl font-bold text-emerald-700">${stats.income.toLocaleString()}</h2>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-rose-600 text-xs md:text-sm mb-1 font-medium">本月支出</p>
                <h2 className="text-lg md:text-2xl font-bold text-rose-700">${stats.expense.toLocaleString()}</h2>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Sparkles />
                <h3 className="font-semibold text-indigo-900">AI 語意記帳</h3>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="例如：中午在超商買了 120 元的便當..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiInput()}
                  className="w-full bg-white/80 backdrop-blur border border-indigo-200 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
                <button 
                  onClick={handleAiInput}
                  disabled={loading || !aiChatInput}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:text-indigo-800 disabled:opacity-30 transition-opacity"
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-indigo-400 mt-2 px-1">Tip: 試著說「昨天晚上和朋友吃飯花了800元」</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[350px]">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Icons.ChartBar />
                  本月支出佔比
                </h3>
                {stats.categoryData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#CBD5E1'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-400 italic text-sm">
                    暫無本月支出數據
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-indigo-600">
                  <Icons.Sparkles />
                  AI 理財助理
                </h3>
                {aiAnalysis ? (
                  <div className="space-y-4">
                    <div className="text-sm text-slate-600 leading-relaxed bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="font-medium text-indigo-900 mb-1">💡 分析總結</p>
                      {aiAnalysis.summary}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">建議行動</p>
                      {aiAnalysis.recommendations.map((rec, i) => (
                        <div key={i} className="text-sm text-slate-700 flex gap-3 items-start group">
                          <span className="shrink-0 w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">{i+1}</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Icons.Sparkles />
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">需要理財建議嗎？</p>
                      <p className="text-slate-400 text-xs mt-1">分析最近 20 筆記錄來提供洞察</p>
                    </div>
                    <button 
                      onClick={requestAnalysis}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition-all shadow-md active:scale-95"
                      disabled={loading || transactions.length < 3}
                    >
                      生成專屬分析
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Transactions List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">最近記錄</h3>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{transactions.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {transactions.length > 0 ? (
                  <div className="space-y-1">
                    {transactions.map(t => (
                      <div key={t.id} className="group p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                            style={{ backgroundColor: `${CATEGORY_COLORS[t.category]}15`, color: CATEGORY_COLORS[t.category] }}
                          >
                            {t.category[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{t.note || t.category}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">{t.date}</span>
                              <span className="text-[10px] text-slate-300 px-1.5 py-0.5 rounded-md bg-slate-100">{t.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-sm tabular-nums ${t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()}
                          </span>
                          <button 
                            onClick={() => deleteTransaction(t.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-40">
                    <Icons.Wallet />
                    <p className="text-slate-500 text-sm mt-4">還沒有記錄，點擊上方按鈕開始吧！</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* Reports View */
        <main className="max-w-6xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">數據報表</h2>
              <p className="text-slate-500 text-sm">追蹤您的收支趨勢與消費結構</p>
            </div>
            
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setReportYear(y => y - 1)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span className="px-4 font-bold text-slate-700">{reportYear} 年</span>
              <button 
                onClick={() => setReportYear(y => y + 1)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase mb-2">年度總結餘</p>
              <h3 className={`text-2xl font-bold ${(reportStats.totalYearIncome - reportStats.totalYearExpense) >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                ${(reportStats.totalYearIncome - reportStats.totalYearExpense).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase mb-2">年度總收入</p>
              <h3 className="text-2xl font-bold text-emerald-600">${reportStats.totalYearIncome.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase mb-2">年度總支出</p>
              <h3 className="text-2xl font-bold text-rose-600">${reportStats.totalYearExpense.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase mb-2">儲蓄率</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {reportStats.totalYearIncome > 0 
                  ? `${Math.round(((reportStats.totalYearIncome - reportStats.totalYearExpense) / reportStats.totalYearIncome) * 100)}%`
                  : '0%'
                }
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Bar Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Icons.ChartBar />
                月度收支趨勢
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportStats.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Yearly Category Pie Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6">年度消費結構</h3>
              {reportStats.yearlyCategoryData.length > 0 ? (
                <>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportStats.yearlyCategoryData}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {reportStats.yearlyCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#CBD5E1'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-3">
                    {reportStats.yearlyCategoryData.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name] }} />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <div className="font-bold text-slate-800">
                          ${item.value.toLocaleString()} 
                          <span className="ml-2 text-[10px] text-slate-400 font-normal">
                            ({Math.round((item.value / reportStats.totalYearExpense) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm py-20">
                  選定年份暫無支出數據
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Manual Input Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-xl text-slate-800">新增交易記錄</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                >支出</button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >收入</button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">金額</label>
                <div className="flex items-center gap-3 border-b-2 border-slate-100 focus-within:border-indigo-500 transition-colors pb-1">
                  <span className="text-2xl font-bold text-slate-400">$</span>
                  <input 
                    autoFocus
                    required
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-4xl font-black bg-transparent outline-none tabular-nums placeholder:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">分類</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">日期</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">備註</label>
                <input 
                  type="text"
                  placeholder="想寫點什麼..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <button 
                type="submit"
                className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl active:scale-[0.98] transition-all mt-4 uppercase tracking-widest ${type === 'expense' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'}`}
              >
                儲存記錄
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
