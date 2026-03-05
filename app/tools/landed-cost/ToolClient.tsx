'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Package, Ship, ShieldCheck, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interface for our calculation data
interface CostData {
  productCost: number;
  quantity: number;
  shippingCost: number;
  customsDutyPercent: number;
  insuranceCost: number;
  currency: string;
}

export default function LandedCostPage() {
  // State for form inputs
  const [values, setValues] = useState<CostData>({
    productCost: 100,
    quantity: 1,
    shippingCost: 25,
    customsDutyPercent: 5,
    insuranceCost: 10,
    currency: 'USD',
  });

  // State for calculated totals
  const [results, setResults] = useState({
    subtotal: 0,
    dutyAmount: 0,
    totalPerUnit: 0,
    grandTotal: 0,
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: name === 'currency' ? value : parseFloat(value) || 0,
    }));
  };

  // Recalculate whenever values change
  useEffect(() => {
    const subtotal = values.productCost * values.quantity;
    const dutyAmount = (subtotal * values.customsDutyPercent) / 100;
    
    // Total Cost = Product + Shipping + Duty + Insurance
    const grandTotal = subtotal + values.shippingCost + dutyAmount + values.insuranceCost;
    const totalPerUnit = values.quantity > 0 ? grandTotal / values.quantity : 0;

    setResults({
      subtotal,
      dutyAmount,
      totalPerUnit,
      grandTotal,
    });
  }, [values]);

  // Helper to format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: values.currency,
    }).format(amount);
  };

  // --- PDF GENERATION LOGIC ---
  const generatePDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('Landed Cost Estimate', 14, 22);

    // Date & Reference
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Date: ${dateStr}`, 14, 30);
    doc.text(`Ref: #LC-${Math.floor(Math.random() * 10000)}`, 14, 35);

    // Table Data
    const tableData = [
      ['Item Description', 'Details'],
      ['Unit Cost', formatMoney(values.productCost)],
      ['Quantity', values.quantity.toString()],
      ['Subtotal', formatMoney(results.subtotal)],
      ['Shipping / Freight', formatMoney(values.shippingCost)],
      [`Duty (${values.customsDutyPercent}%)`, formatMoney(results.dutyAmount)],
      ['Insurance', formatMoney(values.insuranceCost)],
      ['GRAND TOTAL', formatMoney(results.grandTotal)],
      ['Cost Per Unit', formatMoney(results.totalPerUnit)],
    ];

    // Generate Table
    autoTable(doc, {
      head: [['Cost Breakdown', 'Amount']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }, // Blue header
      footStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
    });

    // Save
    doc.save('landed-cost-estimate.pdf');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-8 h-8 text-blue-600" />
              Landed Cost Calculator
            </h1>
            <p className="text-gray-500 mt-2">
              Calculate total import costs including shipping, duties, and insurance.
            </p>
          </div>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Download Quote
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Product Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Product Cost */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Unit Cost</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="productCost"
                      value={values.productCost}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Quantity</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="quantity"
                      value={values.quantity}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Logistics & Taxes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Shipping */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Total Shipping Cost</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Ship className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="shippingCost"
                      value={values.shippingCost}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Insurance */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Insurance</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="insuranceCost"
                      value={values.insuranceCost}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Customs Duty */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Customs Duty (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="customsDutyPercent"
                      value={values.customsDutyPercent}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                 {/* Currency Selector */}
                 <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <select
                    name="currency"
                    value={values.currency}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-6">Cost Breakdown</h2>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Product Subtotal</span>
                  <span>{formatMoney(results.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Freight / Shipping</span>
                  <span>{formatMoney(values.shippingCost)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Estimated Duties ({values.customsDutyPercent}%)</span>
                  <span>{formatMoney(results.dutyAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Insurance</span>
                  <span>{formatMoney(values.insuranceCost)}</span>
                </div>
                
                <hr className="border-slate-700 my-4" />
                
                <div className="flex justify-between items-center text-lg font-bold text-white">
                  <span>Grand Total</span>
                  <span>{formatMoney(results.grandTotal)}</span>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Per Unit</span>
                    <span className="text-xl font-bold text-green-400">{formatMoney(results.totalPerUnit)}</span>
                  </div>
                </div>

                <button 
                  onClick={generatePDF}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Save as PDF
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* --- CREATOR FOOTER START --- */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            {/* Instagram Icon */}
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-pink-500 transition-colors"
              title="Instagram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            {/* GitHub Icon */}
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              title="GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
        {/* --- CREATOR FOOTER END --- */}
    </div>
  );
}