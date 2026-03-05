'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calculator, Truck, Package, Info, 
  TrendingUp, Search, HelpCircle, Clock, BookOpen, Lightbulb, Settings 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

// --- TYPE DEFINITIONS ---
type FeeSlab = {
  limit: number; // Upper limit of the slab
  rate: number;  // Percentage rate
};

type CategoryRule = {
  name: string;
  type: 'flat' | 'tiered';
  ranges?: FeeSlab[]; // For tiered
  flatRate?: number;  // For flat
};

// --- DATA: ADVANCED CATEGORY RULES (2025/26 Updated) ---
const ADVANCED_CATEGORIES: Record<string, CategoryRule> = {
  'mobile': { name: 'Mobiles & Smartphones', type: 'flat', flatRate: 5.0 },
  'laptops': { 
    name: 'Laptops', 
    type: 'tiered', 
    ranges: [ { limit: 70000, rate: 6.0 }, { limit: Infinity, rate: 7.0 } ]
  },
  'tablets': { 
    name: 'Tablets', 
    type: 'tiered', 
    ranges: [ { limit: 12000, rate: 6.0 }, { limit: Infinity, rate: 10.0 } ]
  },
  'apparel_mens': { 
    name: 'Apparel - Men\'s T-shirts', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 13.0 }, { limit: 1000, rate: 17.0 }, { limit: Infinity, rate: 19.0 } ]
  },
  'apparel_womens': { 
    name: 'Apparel - Women\'s Innerwear', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 13.0 }, { limit: Infinity, rate: 18.0 } ]
  },
  'footwear': { 
    name: 'Shoes & Footwear', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 6.0 }, { limit: 1000, rate: 10.0 }, { limit: Infinity, rate: 16.5 } ]
  },
  'books': { 
    name: 'Books', 
    type: 'tiered', 
    ranges: [ { limit: 250, rate: 3.0 }, { limit: 500, rate: 4.5 }, { limit: 1000, rate: 9.0 }, { limit: Infinity, rate: 13.5 } ]
  },
  'toys': { 
    name: 'Toys & Games', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 8.5 }, { limit: 1000, rate: 10.5 }, { limit: Infinity, rate: 12.5 } ]
  },
  'beauty': { 
    name: 'Beauty (Makeup)', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 6.0 }, { limit: Infinity, rate: 9.0 } ]
  },
  'home': { 
    name: 'Home Decor & Furnishing', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 6.0 }, { limit: Infinity, rate: 12.5 }, { limit: Infinity, rate: 13.5 } ]
  },
  'kitchen': { 
    name: 'Kitchen Accessories', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 5.0 }, { limit: Infinity, rate: 12.0 } ]
  },
  'automotive': { 
    name: 'Car & Bike Accessories', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 6.5 }, { limit: 1000, rate: 8.5 }, { limit: Infinity, rate: 14.0 } ]
  },
  'luggage': { 
    name: 'Luggage & Backpacks', 
    type: 'tiered', 
    ranges: [ { limit: 300, rate: 0 }, { limit: 500, rate: 6.5 }, { limit: 1000, rate: 6.5 }, { limit: Infinity, rate: 5.5 } ]
  },
  'default': { name: 'Other / General Category', type: 'flat', flatRate: 15.0 }
};

export default function AmazonFeeCalculatorPage() {
  // --- STATE ---
  const [sellingPrice, setSellingPrice] = useState<number>(699);
  const [productCost, setProductCost] = useState<number>(250);
  const [selectedCatKey, setSelectedCatKey] = useState<string>('apparel_mens');
  const [weight, setWeight] = useState<number>(0.4); // kg
  
  // Logistics State
  const [fulfillment, setFulfillment] = useState<'fba' | 'easyship' | 'self'>('fba');
  const [location, setLocation] = useState<'local' | 'regional' | 'national'>('national');
  
  // 2025 New Fees Toggle
  const [includeMarketplaceFee, setIncludeMarketplaceFee] = useState(true);

  // UI State for Tabs
  const [activeTab, setActiveTab] = useState<'when' | 'how' | 'why'>('when');

  // --- CALCULATION LOGIC (Memoized) ---
  const results = useMemo(() => {
    // 1. Referral Fee Logic
    const category = ADVANCED_CATEGORIES[selectedCatKey] || ADVANCED_CATEGORIES['default'];
    let refRate = 0;
    
    if (category.type === 'flat') {
      refRate = category.flatRate || 0;
    } else if (category.type === 'tiered') {
      const slab = category.ranges?.find(r => sellingPrice <= r.limit);
      refRate = slab ? slab.rate : (category.ranges?.[category.ranges.length - 1].rate || 0);
    }

    const referralFee = (sellingPrice * refRate) / 100;

    // 2. Closing Fee (Approx FBA/Easy Ship slabs)
    let closingFee = 0;
    if (fulfillment === 'self') {
      if (sellingPrice <= 250) closingFee = 4;
      else if (sellingPrice <= 500) closingFee = 9;
      else if (sellingPrice <= 1000) closingFee = 30;
      else closingFee = 60;
    } else {
      // FBA / Easy Ship
      if (sellingPrice <= 250) closingFee = 25;
      else if (sellingPrice <= 500) closingFee = 20; 
      else if (sellingPrice <= 1000) closingFee = 25;
      else closingFee = 50;
    }

    // 3. Weight Handling Fee
    let shippingFee = 0;
    // Base Rates: Local | Regional | National | Extra per 500g
    const rates = {
      fba: { local: 29, regional: 45, national: 65, extra: 25 },
      easyship: { local: 44, regional: 53, national: 74, extra: 32 },
      self: { local: 50, regional: 50, national: 50, extra: 30 } // User estimation
    };

    const currentRates = rates[fulfillment];
    const baseRate = location === 'local' ? currentRates.local 
                   : location === 'regional' ? currentRates.regional 
                   : currentRates.national;
    
    // Weight multiplier (Round up to nearest 0.5kg, -1 because base covers first 500g)
    const weightMultiplier = Math.ceil(weight * 2) - 1; 
    const extraCharge = Math.max(0, weightMultiplier * currentRates.extra);
    
    shippingFee = baseRate + extraCharge;

    // 4. Other Fees
    const pickPack = fulfillment === 'fba' ? 25 : 0; 
    const techFee = includeMarketplaceFee ? 5 : 0; 
    const storageFee = fulfillment === 'fba' ? 5 : 0; 

    // 5. Totals
    const totalFeesBeforeTax = referralFee + closingFee + shippingFee + pickPack + techFee + storageFee;
    const gst = totalFeesBeforeTax * 0.18;
    const totalDeduction = totalFeesBeforeTax + gst;
    
    const netProfit = sellingPrice - productCost - totalDeduction;
    const margin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
    const roi = productCost > 0 ? (netProfit / productCost) * 100 : 0;

    return {
      refRate,
      referralFee,
      closingFee,
      shippingFee,
      pickPack,
      techFee,
      storageFee,
      gst,
      totalDeduction,
      netProfit,
      margin,
      roi
    };
  }, [sellingPrice, productCost, selectedCatKey, weight, fulfillment, location, includeMarketplaceFee]);

  const chartData = [
    { name: 'Cost', value: productCost, color: '#94a3b8' },
    { name: 'Amazon Fees', value: results.totalDeduction - results.gst, color: '#f59e0b' },
    { name: 'GST', value: results.gst, color: '#ef4444' },
    { name: 'Profit', value: Math.max(0, results.netProfit), color: '#10b981' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/tools" className="p-2 hover:bg-white rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-600" /> Advanced Amazon Profit Calculator
            </h1>
            <p className="text-slate-500 text-sm">Deep-dive calculator with updated 2025 Tiered Logic & Fees.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* --- LEFT PANEL: CONFIGURATION (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Product Details */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" /> Product Configuration
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                <div className="relative">
                  <select 
                    className="w-full p-2.5 pl-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium appearance-none"
                    value={selectedCatKey}
                    onChange={(e) => setSelectedCatKey(e.target.value)}
                  >
                    {Object.entries(ADVANCED_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                  <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Selling Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-sans">₹</span>
                    <input 
                      type="number" 
                      className="w-full pl-6 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-sans">₹</span>
                    <input 
                      type="number" 
                      className="w-full pl-6 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                      value={productCost}
                      onChange={(e) => setProductCost(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Weight (Kg)</label>
                <input 
                  type="number" step="0.1"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Logistics Engine */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" /> Logistics Engine
              </h3>

              {/* Fulfillment Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                {['fba', 'easyship', 'self'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFulfillment(mode as any)}
                    className={`text-xs font-bold py-2 rounded-md transition-all ${fulfillment === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {mode === 'fba' ? 'FBA' : mode === 'easyship' ? 'Easy Ship' : 'Self'}
                  </button>
                ))}
              </div>

              {/* Location Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Shipping Zone</label>
                <div className="flex gap-2">
                  {['local', 'regional', 'national'].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocation(loc as any)}
                      className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition-colors capitalize ${location === loc ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-slate-600 font-medium">Include ₹5 Platform Fee?</span>
                  <div 
                    className={`w-10 h-5 rounded-full relative transition-colors ${includeMarketplaceFee ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    onClick={() => setIncludeMarketplaceFee(!includeMarketplaceFee)}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${includeMarketplaceFee ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </label>
              </div>

            </div>
          </div>

          {/* --- RIGHT PANEL: ANALYTICS (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Referral Rate</p>
                <div className="text-2xl font-bold text-indigo-600">{results.refRate}%</div>
                <p className="text-[10px] text-slate-400">Based on Price Tier</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total Fees</p>
                <div className="text-2xl font-bold text-red-500">₹{results.totalDeduction.toFixed(0)}</div>
                <p className="text-[10px] text-slate-400">Inc. GST & Closing</p>
              </div>
              <div className={`bg-white p-4 rounded-xl border shadow-sm ${results.netProfit > 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Net Profit</p>
                <div className={`text-2xl font-bold ${results.netProfit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₹{results.netProfit.toFixed(0)}
                </div>
                <p className="text-[10px] text-slate-400">ROI: {results.roi.toFixed(0)}%</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-600 opacity-5"></div>
                <div className="text-center">
                  <p className="text-[10px] text-indigo-800 font-bold uppercase mb-1">Net Margin</p>
                  <div className="text-3xl font-black text-indigo-700">{results.margin.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Main Dashboard */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Fee Waterfall */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> Fee Waterfall
                </h3>
                <div className="space-y-1">
                  <FeeRow label="Referral Fee" val={results.referralFee} />
                  <FeeRow label="Closing Fee" val={results.closingFee} />
                  <FeeRow label="Weight Handling" val={results.shippingFee} highlight={results.shippingFee > 100} />
                  {fulfillment === 'fba' && <FeeRow label="Pick & Pack" val={results.pickPack} />}
                  {results.storageFee > 0 && <FeeRow label="Storage (Est.)" val={results.storageFee} />}
                  {results.techFee > 0 && <FeeRow label="Platform Fee" val={results.techFee} />}
                  <div className="border-t border-slate-100 my-2"></div>
                  <FeeRow label="GST (18%)" val={results.gst} isTax />
                </div>
                <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center mt-2">
                  <span className="text-xs font-bold text-slate-600">Total Deduction</span>
                  <span className="text-sm font-bold text-red-600">- ₹{results.totalDeduction.toFixed(2)}</span>
                </div>
              </div>

              {/* Visual Breakdown */}
              <div className="relative min-h-[220px]">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-4 justify-center">
                  <Settings className="w-4 h-4 text-indigo-600" /> Profit Distribution
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => `₹${val.toFixed(0)}`} />
                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Dynamic Message */}
                {results.netProfit < 0 && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
                    Loss Making!
                  </div>
                )}
              </div>

            </div>

            {/* Smart Insights */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-blue-900">Profit Intelligence</h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    {sellingPrice < 300 && selectedCatKey.includes('apparel') ? (
                      <span>Great! You are in the <strong>0% Referral Fee</strong> zone (under ₹300). This maximizes your margin on low-ticket items.</span>
                    ) : (
                      <span>
                        Your Referral Fee is <strong>{results.refRate}%</strong>. 
                        {location === 'national' && ' Switching to Regional inventory placement could save you approx ₹20 per unit on shipping.'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- EDUCATION SECTION --- */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-8">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Understanding Amazon Fees</h2>
          </div>
          
          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-100 pb-4 mb-6">
              <button 
                onClick={() => setActiveTab('when')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'when' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Clock className="w-4 h-4" /> When do I pay?
              </button>
              <button 
                onClick={() => setActiveTab('how')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'how' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Calculator className="w-4 h-4" /> How is it calculated?
              </button>
              <button 
                onClick={() => setActiveTab('why')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'why' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Lightbulb className="w-4 h-4" /> Why does it matter?
              </button>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {activeTab === 'when' && (
                <>
                  <InfoCard 
                    title="Referral Fee" 
                    desc="Charged immediately when an item is sold. It is deducted from your payout before the money hits your bank." 
                  />
                  <InfoCard 
                    title="Closing Fee" 
                    desc="Charged on every successful order regardless of the item's price or category. It covers payment gateway costs." 
                  />
                  <InfoCard 
                    title="Shipping / Weight Fee" 
                    desc="Charged when Amazon ships the order (Easy Ship or FBA). If you self-ship, you pay the courier directly." 
                  />
                  <InfoCard 
                    title="FBA Storage Fee" 
                    desc="Charged monthly based on the volume (cubic feet) your products occupy in Amazon's warehouse." 
                  />
                </>
              )}

              {activeTab === 'how' && (
                <>
                  <InfoCard 
                    title="Referral Fee Logic" 
                    desc="It is a percentage of the Total Selling Price (Product Price + Shipping Charge). For example, 15% on a ₹1000 item = ₹150." 
                  />
                  <InfoCard 
                    title="Weight Calculation" 
                    desc="Amazon compares Actual Weight vs. Volumetric Weight (L x B x H / 5000). They charge you based on whichever is higher." 
                  />
                  <InfoCard 
                    title="Closing Fee Slabs" 
                    desc="It works in fixed slabs. Example: ₹5 for items below ₹250, ₹10 for ₹250-500, and up to ₹50 for items above ₹1000." 
                  />
                  <InfoCard 
                    title="GST Impact" 
                    desc="Don't forget GST! Amazon charges 18% tax on all their service fees. This calculator includes that in the total deduction." 
                  />
                </>
              )}

              {activeTab === 'why' && (
                <>
                  <InfoCard 
                    title="Profit Margin Protection" 
                    desc="A small error in weight estimation can double your shipping fee. Knowing exact fees ensures you don't sell at a loss." 
                  />
                  <InfoCard 
                    title="FBA vs Self Ship Decision" 
                    desc="FBA fees are higher, but you get Prime badging. Use this tool to see if the extra cost is worth the potential sales boost." 
                  />
                  <InfoCard 
                    title="Pricing Strategy" 
                    desc="Understanding 'Price Bands' helps. Selling at ₹501 might cost you ₹20 extra in Closing Fees compared to selling at ₹499." 
                  />
                  <InfoCard 
                    title="Hidden Costs" 
                    desc="Many sellers ignore Closing Fees or GST on fees. Over a year, these small costs add up to lakhs in lost profit." 
                  />
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENT ---
function FeeRow({ label, val, isTax, highlight }: { label: string, val: number, isTax?: boolean, highlight?: boolean }) {
  if (val === 0) return null;
  return (
    <div className={`flex justify-between items-center text-sm py-1 ${isTax ? 'text-slate-400 italic' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={`font-medium ${highlight ? 'text-orange-600' : 'text-slate-900'}`}>
        ₹{val.toFixed(2)}
      </span>
    </div>
  );
}

function InfoCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="mt-1 min-w-[20px]">
        <BookOpen className="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}