import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useProperty } from '../context/PropertyContext';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Layers, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap, 
  Receipt,
  Wallet
} from 'lucide-react';
import { Button } from './ui/Primitives';

export type ChartMode = 'slicer' | 'cashflow' | 'revenue_split' | 'electricity_paid' | 'expense_breakdown';
type ChartMetric = 'rent' | 'electricity' | 'electricityPaid' | 'expense';

interface MonthlyFinancialSummary {
  month: string;           // '2026-05'
  monthLabel: string;      // 'May 2026'
  shortLabel: string;      // "May '26"
  rentRevenue: number;     // ₹ Rent collected
  electricityRevenue: number; // ₹ Electricity received
  electricityPaid: number; // ₹ Electricity utility expenses paid
  totalRevenue: number;    // ₹ Combined revenue
  totalExpense: number;    // ₹ Full building expenses
  netProfit: number;       // ₹ Revenue - Expenses
  profitMargin: number;    // %
  totalKwh: number;        // kWh consumed
}

interface RevenueD3ChartProps {
  buildingId?: string;
  months?: string[];
  collectionFilter?: 'ALL' | 'PAID' | 'DUE';
}

export const RevenueD3Chart: React.FC<RevenueD3ChartProps> = ({
  buildingId,
  months,
  collectionFilter = 'ALL',
}) => {
  const { statements, buildingExpenses, buildings, selectedBuildingId } = useProperty();
  const effectiveBuildingId = buildingId ?? selectedBuildingId;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const chartMode: ChartMode = 'slicer';
  const [selectedMetrics, setSelectedMetrics] = useState<ChartMetric[]>([
    'rent',
    'electricity',
    'electricityPaid',
    'expense',
  ]);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    items: { label: string; value: string; color: string }[];
    footer?: string;
  } | null>(null);

  const activeBuilding = buildings.find(b => b.id === effectiveBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';

  // Monthly aggregated data across 6 months
  const monthlyData: MonthlyFinancialSummary[] = useMemo(() => {
    const allowedMonths = months ? new Set(months) : null;
    const allMonths = Array.from(new Set(statements.map(s => s.month)))
      .filter(month => !allowedMonths || allowedMonths.has(month))
      .sort();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return allMonths.map(month => {
      // Filter statements for month and building
      const stmts = statements.filter(s => {
        if (effectiveBuildingId !== 'all' && s.buildingId !== effectiveBuildingId) {
          return false;
        }
        if (collectionFilter === 'PAID' && s.balanceThisMonth > 0) return false;
        if (collectionFilter === 'DUE' && s.balanceThisMonth <= 0) return false;
        return s.month === month;
      });

      // Filter expenses for month and building
      const exps = buildingExpenses.filter(e => {
        if (effectiveBuildingId !== 'all' && e.buildingId !== effectiveBuildingId) {
          return false;
        }
        return e.month === month;
      });

      const [yearStr, mStr] = month.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      const shortYear = yearStr.slice(2);
      const shortLabel = `${monthNames[mIdx]} '${shortYear}`;
      const monthLabel = `${fullMonthNames[mIdx]} ${yearStr}`;

      let rentRevenue = 0;
      let electricityRevenue = 0;
      let totalKwh = 0;

      stmts.forEach(s => {
        totalKwh += s.totalReading;
        const totalBilled = s.baseRent + s.electricityAmount;
        const paidRatio = totalBilled > 0 ? (s.paymentReceived / totalBilled) : 0;

        if (s.electricityReceived !== undefined) {
          electricityRevenue += s.electricityReceived;
          rentRevenue += Math.max(0, s.paymentReceived - s.electricityReceived);
        } else {
          rentRevenue += s.baseRent * paidRatio;
          electricityRevenue += s.electricityAmount * paidRatio;
        }
      });

      const totalRevenue = Number((rentRevenue + electricityRevenue).toFixed(2));
      const electricityPaid = Number(
        exps
          .filter(expense => expense.category === 'ELECTRICITY_PAID')
          .reduce((sum, expense) => sum + expense.amount, 0)
          .toFixed(2),
      );
      const totalExpense = Number(exps.reduce((sum, e) => sum + e.amount, 0).toFixed(2));
      const netProfit = Number((totalRevenue - totalExpense).toFixed(2));
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        month,
        monthLabel,
        shortLabel,
        rentRevenue: Math.round(rentRevenue),
        electricityRevenue: Math.round(electricityRevenue),
        electricityPaid: Math.round(electricityPaid),
        totalRevenue: Math.round(totalRevenue),
        totalExpense: Math.round(totalExpense),
        netProfit: Math.round(netProfit),
        profitMargin,
        totalKwh,
      };
    });
  }, [statements, buildingExpenses, effectiveBuildingId, months, collectionFilter]);

  // Category breakdown for current month expenses
  const categoryExpenses = useMemo(() => {
    const currentMonth = months?.slice().sort().at(-1) || '2026-10';
    const exps = buildingExpenses.filter(e => {
      if (effectiveBuildingId !== 'all' && e.buildingId !== effectiveBuildingId) {
        return false;
      }
      return e.month === currentMonth;
    });

    const catMap = new Map<string, number>();
    exps.forEach(e => {
      const cat = e.category.replace(/_/g, ' ');
      catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
    });

    return Array.from(catMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [buildingExpenses, effectiveBuildingId, months]);

  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || monthlyData.length === 0) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = 330;

    const margin = { top: 25, right: 30, bottom: 40, left: 75 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('class', 'overflow-visible font-sans');

    // Create defs
    const defs = svg.append('defs');

    // Gradients
    const rentGrad = defs.append('linearGradient').attr('id', 'rentGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    rentGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    rentGrad.append('stop').attr('offset', '100%').attr('stop-color', '#047857');

    const elecGrad = defs.append('linearGradient').attr('id', 'elecGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    elecGrad.append('stop').attr('offset', '0%').attr('stop-color', '#8b5cf6');
    elecGrad.append('stop').attr('offset', '100%').attr('stop-color', '#6d28d9');

    const expGrad = defs.append('linearGradient').attr('id', 'expGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    expGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444');
    expGrad.append('stop').attr('offset', '100%').attr('stop-color', '#b91c1c');

    const elecPaidGrad = defs.append('linearGradient').attr('id', 'elecPaidGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    elecPaidGrad.append('stop').attr('offset', '0%').attr('stop-color', '#da70d6');
    elecPaidGrad.append('stop').attr('offset', '100%').attr('stop-color', '#9932cc');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Helper for formatting Indian currency (Lakhs / Thousands)
    const formatINR = (val: number) => {
      if (val >= 100000) {
        return `${currency}${(val / 100000).toFixed(1)}L`;
      }
      return `${currency}${(val / 1000).toFixed(0)}k`;
    };

    if (chartMode === 'slicer') {
      const metricConfig = {
        rent: {
          label: 'Rent Recv.',
          color: 'url(#rentGrad)',
          solid: '#10b981',
          value: (item: MonthlyFinancialSummary) => item.rentRevenue,
        },
        electricity: {
          label: 'Electricity Received',
          color: 'url(#elecGrad)',
          solid: '#7c3aed',
          value: (item: MonthlyFinancialSummary) => item.electricityRevenue,
        },
        electricityPaid: {
          label: 'Electricity Paid',
          color: 'url(#elecPaidGrad)',
          solid: '#ba55d3',
          value: (item: MonthlyFinancialSummary) => item.electricityPaid,
        },
        expense: {
          label: 'Expense',
          color: 'url(#expGrad)',
          solid: '#dc2626',
          value: (item: MonthlyFinancialSummary) => item.totalExpense,
        },
      } satisfies Record<ChartMetric, {
        label: string;
        color: string;
        solid: string;
        value: (item: MonthlyFinancialSummary) => number;
      }>;
      const activeMetrics = selectedMetrics.map(metric => ({
        key: metric,
        ...metricConfig[metric],
      }));
      const x0 = d3.scaleBand()
        .domain(monthlyData.map(item => item.shortLabel))
        .rangeRound([0, width])
        .padding(0.28);
      const x1 = d3.scaleBand<ChartMetric>()
        .domain(selectedMetrics)
        .rangeRound([0, x0.bandwidth()])
        .padding(0.12);
      const maxValue = d3.max(
        monthlyData,
        item => d3.max(activeMetrics, metric => metric.value(item)) || 0,
      ) || 100000;
      const y = d3.scaleLinear()
        .domain([0, maxValue * 1.15])
        .nice()
        .rangeRound([height, 0]);

      g.append('g').attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ''))
        .selectAll('line')
        .attr('stroke', 'rgba(148, 163, 184, 0.22)')
        .attr('stroke-dasharray', '3 3');
      g.selectAll('.grid .domain').remove();

      const monthGroups = g.selectAll('g.metric-month')
        .data(monthlyData)
        .enter()
        .append('g')
        .attr('class', 'metric-month')
        .attr('transform', item => `translate(${x0(item.shortLabel) || 0},0)`);

      activeMetrics.forEach(metric => {
        monthGroups.append('rect')
          .attr('x', x1(metric.key) || 0)
          .attr('y', height)
          .attr('width', x1.bandwidth())
          .attr('height', 0)
          .attr('fill', metric.color)
          .attr('rx', 2)
          .attr('class', 'cursor-pointer hover:opacity-85')
          .on('mouseenter', (event, item) => {
            const [posX, posY] = d3.pointer(event, containerRef.current);
            setActiveTooltip({
              x: posX,
              y: posY,
              title: item.monthLabel,
              items: [{
                label: metric.label,
                value: `${currency}${metric.value(item).toLocaleString('en-IN')}`,
                color: metric.solid,
              }],
            });
          })
          .on('mouseleave', () => setActiveTooltip(null))
          .transition()
          .duration(500)
          .ease(d3.easeCubicOut)
          .attr('y', item => y(metric.value(item)))
          .attr('height', item => height - y(metric.value(item)));
      });

      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSize(0).tickPadding(8))
        .select('.domain')
        .attr('stroke', 'rgba(148, 163, 184, 0.4)');
      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8).tickFormat(value => formatINR(value as number)))
        .select('.domain')
        .remove();
      g.selectAll('.tick text').attr('class', 'text-xs font-mono fill-slate-500');
    } else if (chartMode === 'cashflow') {
      // CASH FLOW: Monthly Revenue vs Building Expenses vs Net Profit
      const x0 = d3.scaleBand()
        .domain(monthlyData.map(d => d.shortLabel))
        .rangeRound([0, width])
        .padding(0.3);

      const subKeys = ['Total Revenue', 'Building Expense'];
      const x1 = d3.scaleBand()
        .domain(subKeys)
        .rangeRound([0, x0.bandwidth()])
        .padding(0.1);

      const maxVal = d3.max(monthlyData, d => Math.max(d.totalRevenue, d.totalExpense)) || 1000000;
      const y = d3.scaleLinear()
        .domain([0, maxVal * 1.15])
        .nice()
        .rangeRound([height, 0]);

      // Gridlines
      g.append('g').attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ''))
        .selectAll('line').attr('stroke', 'rgba(148, 163, 184, 0.22)').attr('stroke-dasharray', '3 3');
      g.selectAll('.grid .domain').remove();

      // Month groups
      const monthGroups = g.selectAll('g.month-group')
        .data(monthlyData)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${x0(d.shortLabel) || 0},0)`);

      // Revenue Bars (Emerald)
      monthGroups.append('rect')
        .attr('x', x1('Total Revenue') || 0)
        .attr('y', height)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', 'url(#rentGrad)')
        .attr('rx', 3)
        .attr('class', 'cursor-pointer hover:opacity-85')
        .on('mouseenter', (event, d) => {
          const [posX, posY] = d3.pointer(event, containerRef.current);
          setActiveTooltip({
            x: posX,
            y: posY,
            title: d.monthLabel,
            items: [
              { label: 'Total Revenue Inflow', value: `${currency}${d.totalRevenue.toLocaleString('en-IN')}`, color: '#10b981' },
              { label: 'Rent Payments', value: `${currency}${d.rentRevenue.toLocaleString('en-IN')}`, color: '#059669' },
              { label: 'Electricity Payments', value: `${currency}${d.electricityRevenue.toLocaleString('en-IN')}`, color: '#0ea5e9' },
              { label: 'Building Expenses', value: `${currency}${d.totalExpense.toLocaleString('en-IN')}`, color: '#3b82f6' },
              { label: 'Net Operating Profit', value: `${currency}${d.netProfit.toLocaleString('en-IN')}`, color: '#0f766e' },
            ],
            footer: `Profit Margin: ${d.profitMargin.toFixed(1)}%`
          });
        })
        .on('mouseleave', () => setActiveTooltip(null))
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('y', d => y(d.totalRevenue))
        .attr('height', d => height - y(d.totalRevenue));

      // Expense Bars (Blue)
      monthGroups.append('rect')
        .attr('x', x1('Building Expense') || 0)
        .attr('y', height)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', 'url(#expGrad)')
        .attr('rx', 3)
        .attr('class', 'cursor-pointer hover:opacity-85')
        .on('mouseenter', (event, d) => {
          const [posX, posY] = d3.pointer(event, containerRef.current);
          setActiveTooltip({
            x: posX,
            y: posY,
            title: d.monthLabel,
            items: [
              { label: 'Total Building Expenses', value: `${currency}${d.totalExpense.toLocaleString('en-IN')}`, color: '#3b82f6' },
              { label: 'Total Revenue Inflow', value: `${currency}${d.totalRevenue.toLocaleString('en-IN')}`, color: '#10b981' },
              { label: 'Net Monthly Profit', value: `${currency}${d.netProfit.toLocaleString('en-IN')}`, color: '#0f766e' },
            ],
            footer: `Building Outflow: Common Power, Security, Lift AMC, Housekeeping`
          });
        })
        .on('mouseleave', () => setActiveTooltip(null))
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('y', d => y(d.totalExpense))
        .attr('height', d => height - y(d.totalExpense));

      // Net Profit Line overlay
      const profitLine = d3.line<MonthlyFinancialSummary>()
        .x(d => (x0(d.shortLabel) || 0) + x0.bandwidth() / 2)
        .y(d => y(d.netProfit))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(monthlyData)
        .attr('fill', 'none')
        .attr('stroke', '#0f766e')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '4 2')
        .attr('d', profitLine);

      // Profit Dots
      g.selectAll('.profit-dot')
        .data(monthlyData)
        .enter()
        .append('circle')
        .attr('class', 'profit-dot cursor-pointer')
        .attr('cx', d => (x0(d.shortLabel) || 0) + x0.bandwidth() / 2)
        .attr('cy', d => y(d.netProfit))
        .attr('r', 4.5)
        .attr('fill', '#0d9488')
        .attr('stroke', '#ccfbf1')
        .attr('stroke-width', 2)
        .on('mouseenter', (event, d) => {
          const [posX, posY] = d3.pointer(event, containerRef.current);
          setActiveTooltip({
            x: posX,
            y: posY,
            title: `${d.monthLabel} - Net Profit`,
            items: [
              { label: 'Net Operating Profit', value: `${currency}${d.netProfit.toLocaleString('en-IN')}`, color: '#0f766e' },
              { label: 'Operating Margin', value: `${d.profitMargin.toFixed(1)}%`, color: '#10b981' },
            ]
          });
        })
        .on('mouseleave', () => setActiveTooltip(null));

      // X Axis
      g.append('g').attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSize(0).tickPadding(8))
        .select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.4)');
      g.selectAll('.tick text').attr('class', 'text-xs font-mono fill-slate-500');

      // Y Axis
      g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8).tickFormat(d => formatINR(d as number)))
        .select('.domain').remove();

    } else if (chartMode === 'revenue_split' || chartMode === 'electricity_paid') {
      // Single-series tenant collection view
      const x0 = d3.scaleBand()
        .domain(monthlyData.map(d => d.shortLabel))
        .rangeRound([0, width])
        .padding(0.34);

      const isRentView = chartMode === 'revenue_split';
      const keys = [isRentView ? 'rentRevenue' : 'electricityRevenue'];
      const stack = d3.stack<MonthlyFinancialSummary>().keys(keys);
      const series = stack(monthlyData);

      const maxVal = d3.max(
        monthlyData,
        d => isRentView ? d.rentRevenue : d.electricityRevenue,
      ) || 1000000;
      const y = d3.scaleLinear()
        .domain([0, maxVal * 1.15])
        .nice()
        .rangeRound([height, 0]);

      // Gridlines
      g.append('g').attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ''))
        .selectAll('line').attr('stroke', 'rgba(148, 163, 184, 0.22)').attr('stroke-dasharray', '3 3');
      g.selectAll('.grid .domain').remove();

      const colorMap: Record<string, string> = {
        rentRevenue: 'url(#rentGrad)',
        electricityRevenue: 'url(#elecGrad)',
      };

      const layerGroups = g.selectAll('g.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => colorMap[d.key]);

      layerGroups.selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => x0(d.data.shortLabel) || 0)
        .attr('y', height)
        .attr('height', 0)
        .attr('width', x0.bandwidth())
        .attr('rx', 3)
        .attr('class', 'cursor-pointer hover:opacity-85 transition-opacity')
        .on('mouseenter', (event, d) => {
          const [posX, posY] = d3.pointer(event, containerRef.current);
          setActiveTooltip({
            x: posX,
            y: posY,
            title: d.data.monthLabel,
            items: [
              isRentView
                ? { label: 'Rent Received', value: `${currency}${d.data.rentRevenue.toLocaleString('en-IN')}`, color: '#10b981' }
                : { label: 'Electricity Paid', value: `${currency}${d.data.electricityRevenue.toLocaleString('en-IN')}`, color: '#0ea5e9' },
            ],
            footer: isRentView
              ? undefined
              : `Power Used: ${d.data.totalKwh.toLocaleString()} kWh`
          });
        })
        .on('mouseleave', () => setActiveTooltip(null))
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('y', d => y(d[1]))
        .attr('height', d => Math.max(0, y(d[0]) - y(d[1])));

      // Labels on top of stacked bars
      g.selectAll('.total-label')
        .data(monthlyData)
        .enter()
        .append('text')
        .attr('class', 'total-label text-[11px] font-mono fill-slate-600 font-semibold')
        .attr('text-anchor', 'middle')
        .attr('x', d => (x0(d.shortLabel) || 0) + x0.bandwidth() / 2)
        .attr('y', d => y(isRentView ? d.rentRevenue : d.electricityRevenue) - 6)
        .text(d => formatINR(isRentView ? d.rentRevenue : d.electricityRevenue));

      // X Axis
      g.append('g').attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSize(0).tickPadding(8))
        .select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.4)');

      // Y Axis
      g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8).tickFormat(d => formatINR(d as number)))
        .select('.domain').remove();

    } else if (chartMode === 'expense_breakdown') {
      // EXPENSE BREAKDOWN: Horizontal Bar Chart of Full Building Expenses by Category
      const yCat = d3.scaleBand()
        .domain(categoryExpenses.map(c => c.label))
        .rangeRound([0, height])
        .padding(0.25);

      const maxExp = d3.max(categoryExpenses, c => c.value) || 50000;
      const xExp = d3.scaleLinear()
        .domain([0, maxExp * 1.15])
        .rangeRound([0, width]);

      // Category Bars
      g.selectAll('.cat-bar')
        .data(categoryExpenses)
        .enter()
        .append('rect')
        .attr('class', 'cat-bar cursor-pointer hover:opacity-85')
        .attr('x', 0)
        .attr('y', d => yCat(d.label) || 0)
        .attr('height', yCat.bandwidth())
        .attr('width', 0)
        .attr('fill', 'url(#expGrad)')
        .attr('rx', 3)
        .on('mouseenter', (event, d) => {
          const [posX, posY] = d3.pointer(event, containerRef.current);
          setActiveTooltip({
            x: posX,
            y: posY,
            title: `Category: ${d.label}`,
            items: [
              { label: 'Monthly Building Outflow', value: `${currency}${d.value.toLocaleString('en-IN')}`, color: '#3b82f6' },
            ]
          });
        })
        .on('mouseleave', () => setActiveTooltip(null))
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('width', d => xExp(d.value));

      // Value labels at end of bars
      g.selectAll('.cat-value')
        .data(categoryExpenses)
        .enter()
        .append('text')
        .attr('class', 'text-[11px] font-mono fill-slate-700 font-semibold')
        .attr('x', d => xExp(d.value) + 8)
        .attr('y', d => (yCat(d.label) || 0) + yCat.bandwidth() / 2 + 4)
        .text(d => `${currency}${d.value.toLocaleString('en-IN')}`);

      // Y Category Axis
      g.append('g')
        .call(d3.axisLeft(yCat).tickSize(0).tickPadding(10))
        .select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.4)');
      g.selectAll('.tick text').attr('class', 'text-[11px] fill-slate-600 font-medium');
    }

  }, [monthlyData, categoryExpenses, chartMode, currency, selectedMetrics]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-brand-surface/95 p-4 shadow-sm">
      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className="relative min-h-[260px] w-full overflow-hidden rounded-lg border border-brand-border/50 bg-brand-tint/60 p-2"
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-slate-300 bg-white/95 p-1 shadow-sm">
          {([
            {
              metric: 'rent',
              label: 'Rent Recv.',
              activeClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
              inactiveClass: 'bg-emerald-50 text-emerald-800 opacity-50 hover:opacity-75',
            },
            {
              metric: 'electricity',
              label: 'Electricity Received',
              activeClass: 'bg-violet-600 text-white hover:bg-violet-700',
              inactiveClass: 'bg-violet-50 text-violet-800 opacity-50 hover:opacity-75',
            },
            {
              metric: 'electricityPaid',
              label: 'Electricity Paid',
              activeClass: 'bg-fuchsia-500 text-white hover:bg-fuchsia-600',
              inactiveClass: 'bg-fuchsia-50 text-fuchsia-800 opacity-50 hover:opacity-75',
            },
            {
              metric: 'expense',
              label: 'Expense',
              activeClass: 'bg-red-600 text-white hover:bg-red-700',
              inactiveClass: 'bg-red-50 text-red-800 opacity-50 hover:opacity-75',
            },
          ] as const).map(({ metric, label, activeClass, inactiveClass }) => {
            const isSelected = selectedMetrics.includes(metric);
            return (
              <Button
                key={metric}
                type="button"
                onClick={() => setSelectedMetrics(current => {
                  if (current.includes(metric)) {
                    return current.length === 1
                      ? current
                      : current.filter(item => item !== metric);
                  }
                  return [...current, metric];
                })}
                className={`px-2.5 py-1.5 text-[10px] font-semibold ${
                  isSelected ? activeClass : inactiveClass
                }`}
                aria-pressed={isSelected}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <svg ref={svgRef} className="w-full block select-none" />

        {/* Floating Tooltip */}
        {activeTooltip && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-brand-surface border border-slate-300 shadow-2xl text-xs space-y-2 font-sans -translate-x-1/2 -translate-y-full mb-3"
            style={{ 
              left: `${activeTooltip.x}px`, 
              top: `${Math.max(60, activeTooltip.y)}px` 
            }}
          >
            <div className="font-semibold text-slate-950 border-b border-slate-200 pb-1">
              {activeTooltip.title}
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              {activeTooltip.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 text-slate-700">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span>{item.label}:</span>
                  </span>
                  <strong className="text-slate-950">{item.value}</strong>
                </div>
              ))}
            </div>

            {activeTooltip.footer && (
              <div className="pt-1 border-t border-slate-200 text-[10px] font-mono text-emerald-700">
                {activeTooltip.footer}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
