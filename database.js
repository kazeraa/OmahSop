/* ============================================
   Omah Sop - Database Layer (Local Storage + Supabase)
   ============================================ */

// ============ Supabase Configuration ============
const SUPABASE_URL = 'https://bljtxnyzmnyhxntqlhdd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V2kJjD6zub-wWRNGDIyyqQ_EzpEx4vK';

let supabaseClient = null;

// Initialize Supabase client
function initSupabase() {
    if (typeof supabase !== 'undefined' && !supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Omah Sop: Supabase terhubung');
    }
}

// Call init on load
if (typeof supabase !== 'undefined') {
    initSupabase();
} else {
    // Wait for supabase script to load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initSupabase, 1000);
    });
}

// ============ Database Helper ============
const DB = {
    // Keys
    KEYS: {
        INCOME: 'omahsop_income',
        EXPENSES: 'omahsop_expenses',
        RECEIVABLES: 'omahsop_receivables',
        BUDGETS: 'omahsop_budgets'
    },

    SUPABASE_TABLE: 'omahsop_data',

    // Default categories - Indonesian
    INCOME_SOURCES: [
        'Laba Harian' , 'Laba Mingguan', 'Laba Bulanan', 'Laba Tahunan', 'Bisnis', 'Sewa', 'Arisan', 'Lainnya'
    ],

    EXPENSE_CATEGORIES: [
        'Makanan & Minuman', 'Tempat Tinggal', 'Transportasi', 'Listrik & Air',
        'Internet & Pulsa', 'Kesehatan', 'Hiburan', 'Belanja', 'Pendidikan',
        'Wisata', 'Asuransi', 'Lainnya'
    ],

    PAYMENT_METHODS: [
        { value: 'cash', label: 'Tunai' },
        { value: 'card', label: 'Kartu' },
        { value: 'bank', label: 'Transfer Bank' },
        { value: 'ewallet', label: 'E-Wallet' },
        { value: 'other', label: 'Lainnya' }
    ],

    // Initialize with sample data for demo
    init() {
        if (!localStorage.getItem(this.KEYS.INCOME)) {
            const sampleIncome = [
                
            ];
            this.setData(this.KEYS.INCOME, sampleIncome);
        }
        if (!localStorage.getItem(this.KEYS.EXPENSES)) {
            const sampleExpenses = [
                
            ];
            this.setData(this.KEYS.EXPENSES, sampleExpenses);
        }
        if (!localStorage.getItem(this.KEYS.RECEIVABLES)) {
            const sampleReceivables = [
                
            ];
            this.setData(this.KEYS.RECEIVABLES, sampleReceivables);
        }
    },

    // Generic CRUD
    getData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    setData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    },

    // ============ Currency Formatter ============
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // ============ Income operations ============
    getIncome() {
        return this.getData(this.KEYS.INCOME);
    },

    addIncome(entry) {
        const income = this.getIncome();
        entry.id = this.generateId('inc');
        entry.createdAt = Date.now();
        income.unshift(entry);
        this.setData(this.KEYS.INCOME, income);
        return entry;
    },

    updateIncome(id, updates) {
        const income = this.getIncome();
        const index = income.findIndex(e => e.id === id);
        if (index !== -1) {
            income[index] = { ...income[index], ...updates };
            this.setData(this.KEYS.INCOME, income);
            return income[index];
        }
        return null;
    },

    deleteIncome(id) {
        const income = this.getIncome();
        const filtered = income.filter(e => e.id !== id);
        this.setData(this.KEYS.INCOME, filtered);
    },

    // ============ Expense operations ============
    getExpenses() {
        return this.getData(this.KEYS.EXPENSES);
    },

    addExpense(entry) {
        const expenses = this.getExpenses();
        entry.id = this.generateId('exp');
        entry.createdAt = Date.now();
        expenses.unshift(entry);
        this.setData(this.KEYS.EXPENSES, expenses);
        return entry;
    },

    updateExpense(id, updates) {
        const expenses = this.getExpenses();
        const index = expenses.findIndex(e => e.id === id);
        if (index !== -1) {
            expenses[index] = { ...expenses[index], ...updates };
            this.setData(this.KEYS.EXPENSES, expenses);
            return expenses[index];
        }
        return null;
    },

    deleteExpense(id) {
        const expenses = this.getExpenses();
        const filtered = expenses.filter(e => e.id !== id);
        this.setData(this.KEYS.EXPENSES, filtered);
    },

    // ============ Receivable operations ============
    getReceivables() {
        return this.getData(this.KEYS.RECEIVABLES);
    },

    addReceivable(entry) {
        const receivables = this.getReceivables();
        entry.id = this.generateId('rec');
        entry.createdAt = Date.now();
        entry.status = entry.status || 'pending';
        // Check if overdue
        if (entry.status === 'pending' && new Date(entry.dueDate) < new Date()) {
            entry.status = 'overdue';
        }
        receivables.unshift(entry);
        this.setData(this.KEYS.RECEIVABLES, receivables);
        return entry;
    },

    updateReceivable(id, updates) {
        const receivables = this.getReceivables();
        const index = receivables.findIndex(e => e.id === id);
        if (index !== -1) {
            receivables[index] = { ...receivables[index], ...updates };
            this.setData(this.KEYS.RECEIVABLES, receivables);
            return receivables[index];
        }
        return null;
    },

    deleteReceivable(id) {
        const receivables = this.getReceivables();
        const filtered = receivables.filter(e => e.id !== id);
        this.setData(this.KEYS.RECEIVABLES, filtered);
    },

    markAsPaid(id) {
        return this.updateReceivable(id, { status: 'paid' });
    },

    // ============ Budget operations ============
    getBudgets() {
        return this.getData(this.KEYS.BUDGETS);
    },

    setBudgets(budgets) {
        this.setData(this.KEYS.BUDGETS, budgets);
    },

    getBudgetForCategory(category) {
        const budgets = this.getBudgets();
        return budgets.find(b => b.category === category) || null;
    },

    setBudget(category, amount) {
        let budgets = this.getBudgets();
        const existing = budgets.findIndex(b => b.category === category);
        if (existing !== -1) {
            budgets[existing].amount = amount;
        } else {
            budgets.push({ category, amount });
        }
        this.setData(this.KEYS.BUDGETS, budgets);
    },

    removeBudget(category) {
        let budgets = this.getBudgets();
        budgets = budgets.filter(b => b.category !== category);
        this.setData(this.KEYS.BUDGETS, budgets);
    },

    // ============ Import / Export ============
    importData(data) {
        if (data.income) {
            this.setData(this.KEYS.INCOME, data.income);
        }
        if (data.expenses) {
            this.setData(this.KEYS.EXPENSES, data.expenses);
        }
        if (data.receivables) {
            this.setData(this.KEYS.RECEIVABLES, data.receivables);
        }
        if (data.budgets) {
            this.setData(this.KEYS.BUDGETS, data.budgets);
        }
    },

    exportAllData() {
        return {
            income: this.getIncome(),
            expenses: this.getExpenses(),
            receivables: this.getReceivables(),
            budgets: this.getBudgets(),
            exportedAt: new Date().toISOString()
        };
    },

    // Clear all data
    clearAllData() {
        localStorage.removeItem(this.KEYS.INCOME);
        localStorage.removeItem(this.KEYS.EXPENSES);
        localStorage.removeItem(this.KEYS.RECEIVABLES);
        localStorage.removeItem(this.KEYS.BUDGETS);
    },

    // ============ Supabase Integration ============
    async saveToSupabase() {
        if (!supabaseClient) {
            initSupabase();
            if (!supabaseClient) {
                throw new Error('Supabase tidak terhubung. Periksa koneksi internetmu.');
            }
        }

        const data = {
            income: this.getIncome(),
            expenses: this.getExpenses(),
            receivables: this.getReceivables(),
            budgets: this.getBudgets(),
            updatedAt: new Date().toISOString()
        };

        // Try to update existing record, or insert new one
        const { data: existing, error: queryError } = await supabaseClient
            .from(this.SUPABASE_TABLE)
            .select('id')
            .eq('user_id', 'default')
            .single();

        if (queryError && queryError.code !== 'PGRST116') {
            // Table might not exist, try to insert
            const { error: insertError } = await supabaseClient
                .from(this.SUPABASE_TABLE)
                .insert([{ user_id: 'default', data: data }]);

            if (insertError) throw new Error('Gagal menyimpan: ' + insertError.message);
        } else if (existing) {
            const { error: updateError } = await supabaseClient
                .from(this.SUPABASE_TABLE)
                .update({ data: data, updatedAt: new Date().toISOString() })
                .eq('id', existing.id);

            if (updateError) throw new Error('Gagal menyimpan: ' + updateError.message);
        } else {
            const { error: insertError } = await supabaseClient
                .from(this.SUPABASE_TABLE)
                .insert([{ user_id: 'default', data: data }]);

            if (insertError) throw new Error('Gagal menyimpan: ' + insertError.message);
        }

        return true;
    },

    async loadFromSupabase() {
        if (!supabaseClient) {
            initSupabase();
            if (!supabaseClient) {
                throw new Error('Supabase tidak terhubung. Periksa koneksi internetmu.');
            }
        }

        const { data, error } = await supabaseClient
            .from(this.SUPABASE_TABLE)
            .select('data')
            .eq('user_id', 'default')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error('Belum ada data tersimpan di cloud.');
            }
            throw new Error('Gagal memuat data: ' + error.message);
        }

        if (data && data.data) {
            this.importData(data.data);
            return data.data;
        }

        throw new Error('Data tidak ditemukan.');
    },

    // ============ Dashboard Aggregation ============
    getDashboardData() {
        const income = this.getIncome();
        const expenses = this.getExpenses();
        const receivables = this.getReceivables();

        const totalIncome = income.reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalBalance = totalIncome - totalExpenses;

        const pendingReceivables = receivables
            .filter(r => r.status !== 'paid')
            .reduce((sum, r) => sum + r.amount, 0);

        const paidReceivables = receivables
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + r.amount, 0);

        // Expense breakdown by category
        const expenseByCategory = {};
        expenses.forEach(e => {
            expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
        });

        // Recent activity (combine all entries sorted by date)
        const activity = [
            ...income.map(e => ({ ...e, type: 'income' })),
            ...expenses.map(e => ({ ...e, type: 'expense' })),
            ...receivables.map(e => ({ ...e, type: 'receivable' }))
        ].sort((a, b) => new Date(b.date || b.dueDate) - new Date(a.date || a.dueDate));

        return {
            totalIncome,
            totalExpenses,
            totalBalance,
            pendingReceivables,
            paidReceivables,
            totalReceivables: pendingReceivables + paidReceivables,
            expenseByCategory,
            recentActivity: activity.slice(0, 10)
        };
    }
};

// Export for use in app.js
window.DB = DB;
