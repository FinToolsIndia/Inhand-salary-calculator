class SalaryCalculator {
    constructor() {
        this.initializeEventListeners();
        this.handleRegimeChange();
    }

    initializeEventListeners() {
        const calculateBtn = document.getElementById('calculateBtn');
        const regimeSelect = document.getElementById('regime');
        
        calculateBtn.addEventListener('click', () => this.calculateSalary());
        regimeSelect.addEventListener('change', () => this.handleRegimeChange());
        
        // Real-time calculation on input change
        const inputs = ['ctc', 'age', 'section80c', 'section80d', 'hra'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.debounce(() => this.calculateSalary(), 500));
            }
        });
    }

    handleRegimeChange() {
        const regime = document.getElementById('regime').value;
        const oldRegimeSection = document.querySelector('.old-regime-section');
        
        if (regime === 'old') {
            oldRegimeSection.style.display = 'block';
        } else {
            oldRegimeSection.style.display = 'none';
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    calculateSalary() {
        try {
            const inputs = this.getInputValues();
            if (!this.validateInputs(inputs)) return;

            const ctcBreakdown = this.calculateCTCBreakdown(inputs.ctc, inputs.pfOption);
            const taxableIncome = this.calculateTaxableIncome(ctcBreakdown, inputs);
            const incomeTax = this.calculateIncomeTax(taxableIncome, inputs.regime, inputs.age);
            const deductions = this.calculateDeductions(ctcBreakdown, incomeTax, inputs.city);
            const inhandSalary = ctcBreakdown.grossSalary - deductions.total;

            this.displayResults(ctcBreakdown, deductions, inhandSalary, incomeTax);
        } catch (error) {
            console.error('Error calculating salary:', error);
            this.showError('An error occurred while calculating. Please check your inputs.');
        }
    }

    getInputValues() {
        return {
            ctc: parseFloat(document.getElementById('ctc').value) || 0,
            age: parseInt(document.getElementById('age').value) || 30,
            city: document.getElementById('city').value,
            pfOption: document.getElementById('pfOption').value,
            regime: document.getElementById('regime').value,
            section80c: parseFloat(document.getElementById('section80c').value) || 0,
            section80d: parseFloat(document.getElementById('section80d').value) || 0,
            hra: parseFloat(document.getElementById('hra').value) || 0
        };
    }

    validateInputs(inputs) {
        if (inputs.ctc <= 0) {
            this.showError('Please enter a valid CTC amount');
            return false;
        }
        if (inputs.age < 18 || inputs.age > 100) {
            this.showError('Please enter a valid age (18-100)');
            return false;
        }
        return true;
    }

    calculateCTCBreakdown(ctc, pfOption) {
        // Standard breakdown percentages
        const basicPercentage = 0.40; // 40% of CTC
        const hraPercentage = 0.20;   // 20% of CTC
        
        const basic = Math.round(ctc * basicPercentage);
        const hra = Math.round(ctc * hraPercentage);
        
        // PF calculations
        const pfCap = 21600; // Annual PF cap for 2024
        const employeePf = pfOption === 'yes' ? Math.min(basic * 0.12, pfCap) : 0;
        const employerPf = pfOption === 'yes' ? Math.min(basic * 0.12, pfCap) : 0;
        
        // Gratuity (4.81% of basic)
        const gratuity = Math.round(basic * 0.0481);
        
        // Special allowance is the remainder
        const grossSalary = ctc - employerPf - gratuity;
        const specialAllowance = grossSalary - basic - hra;

        return {
            basic,
            hra,
            specialAllowance: Math.round(specialAllowance),
            employerPf: Math.round(employerPf),
            gratuity,
            grossSalary: Math.round(grossSalary),
            employeePf: Math.round(employeePf)
        };
    }

    calculateTaxableIncome(ctcBreakdown, inputs) {
        let taxableIncome = ctcBreakdown.grossSalary;

        // HRA exemption calculation
        if (inputs.regime === 'old' && inputs.hra > 0) {
            const hraExemption = Math.min(
                inputs.hra,
                ctcBreakdown.hra,
                inputs.city === 'metro' ? ctcBreakdown.basic * 0.5 : ctcBreakdown.basic * 0.4
            );
            taxableIncome -= hraExemption;
        }

        // Standard deduction
        const standardDeduction = inputs.regime === 'old' ? 50000 : 75000; // Updated for 2024
        taxableIncome -= standardDeduction;

        // Employee PF deduction
        taxableIncome -= ctcBreakdown.employeePf;

        // Old regime deductions
        if (inputs.regime === 'old') {
            taxableIncome -= Math.min(inputs.section80c, 150000);
            
            // Section 80D limits based on age
            const section80dLimit = inputs.age >= 60 ? 50000 : 25000;
            taxableIncome -= Math.min(inputs.section80d, section80dLimit);
        }

        return Math.max(0, taxableIncome);
    }

    calculateIncomeTax(taxableIncome, regime, age) {
        let tax = 0;
        let taxBreakdown = [];

        if (regime === 'new') {
            // New Tax Regime Slabs for 2024-25
            const slabs = [
                { min: 0, max: 300000, rate: 0, desc: "₹0 - ₹3,00,000" },
                { min: 300000, max: 700000, rate: 0.05, desc: "₹3,00,001 - ₹7,00,000" },
                { min: 700000, max: 1000000, rate: 0.10, desc: "₹7,00,001 - ₹10,00,000" },
                { min: 1000000, max: 1200000, rate: 0.15, desc: "₹10,00,001 - ₹12,00,000" },
                { min: 1200000, max: 1500000, rate: 0.20, desc: "₹12,00,001 - ₹15,00,000" },
                { min: 1500000, max: Infinity, rate: 0.30, desc: "Above ₹15,00,000" }
            ];

            tax = this.calculateTaxFromSlabs(taxableIncome, slabs, taxBreakdown);
        } else {
            // Old Tax Regime Slabs
            const basicExemption = age >= 80 ? 500000 : (age >= 60 ? 300000 : 250000);
            const adjustedIncome = Math.max(0, taxableIncome - (basicExemption - 250000));

            const slabs = [
                { min: 0, max: 250000, rate: 0, desc: "₹0 - ₹2,50,000" },
                { min: 250000, max: 500000, rate: 0.05, desc: "₹2,50,001 - ₹5,00,000" },
                { min: 500000, max: 1000000, rate: 0.20, desc: "₹5,00,001 - ₹10,00,000" },
                { min: 1000000, max: Infinity, rate: 0.30, desc: "Above ₹10,00,000" }
            ];

            tax = this.calculateTaxFromSlabs(adjustedIncome, slabs, taxBreakdown);
        }

        // Health and Education Cess (4%)
        const cess = tax * 0.04;
        
        return {
            tax: Math.round(tax),
            cess: Math.round(cess),
            total: Math.round(tax + cess),
            breakdown: taxBreakdown
        };
    }

    calculateTaxFromSlabs(income, slabs, breakdown) {
        let tax = 0;
        let remainingIncome = income;

        for (const slab of slabs) {
            if (remainingIncome <= 0) break;

            const slabAmount = Math.min(remainingIncome, slab.max - slab.min);
            const slabTax = slabAmount * slab.rate;
            
            if (slabAmount > 0) {
                tax += slabTax;
                breakdown.push({
                    range: slab.desc,
                    amount: slabAmount,
                    rate: slab.rate * 100,
                    tax: slabTax
                });
            }

            remainingIncome -= slabAmount;
        }

        return tax;
    }

    calculateDeductions(ctcBreakdown, incomeTax, city) {
        const employeePf = ctcBreakdown.employeePf;
        const professionalTax = city === 'metro' ? 2500 : 2000; // Annual PT
        
        return {
            employeePf,
            professionalTax,
            incomeTax: incomeTax.total,
            total: employeePf + professionalTax + incomeTax.total
        };
    }

    displayResults(ctcBreakdown, deductions, inhandSalary, incomeTax) {
        // CTC Breakdown
        document.getElementById('basicSalary').textContent = this.formatCurrency(ctcBreakdown.basic);
        document.getElementById('hraAmount').textContent = this.formatCurrency(ctcBreakdown.hra);
        document.getElementById('specialAllowance').textContent = this.formatCurrency(ctcBreakdown.specialAllowance);
        document.getElementById('employerPf').textContent = this.formatCurrency(ctcBreakdown.employerPf);
        document.getElementById('gratuity').textContent = this.formatCurrency(ctcBreakdown.gratuity);
        document.getElementById('totalCtc').textContent = this.formatCurrency(
            ctcBreakdown.basic + ctcBreakdown.hra + ctcBreakdown.specialAllowance + 
            ctcBreakdown.employerPf + ctcBreakdown.gratuity
        );

        // Deductions
        document.getElementById('employeePf').textContent = this.formatCurrency(deductions.employeePf);
        document.getElementById('professionalTax').textContent = this.formatCurrency(deductions.professionalTax);
        document.getElementById('incomeTax').textContent = this.formatCurrency(deductions.incomeTax);
        document.getElementById('totalDeductions').textContent = this.formatCurrency(deductions.total);

        // Final Salary
        document.getElementById('grossSalary').textContent = this.formatCurrency(ctcBreakdown.grossSalary);
        document.getElementById('inhandAnnual').textContent = this.formatCurrency(inhandSalary);
        document.getElementById('inhandMonthly').textContent = this.formatCurrency(Math.round(inhandSalary / 12));

        // Tax Breakdown
        this.displayTaxBreakdown(incomeTax);
    }

    displayTaxBreakdown(incomeTax) {
        const container = document.getElementById('taxBreakdown');
        let html = '';

        if (incomeTax.breakdown.length === 0) {
            html = '<div class="tax-slab">No tax liability</div>';
        } else {
            incomeTax.breakdown.forEach(slab => {
                html += `
                    <div class="tax-slab">
                        <strong>${slab.range}</strong><br>
                        Amount: ${this.formatCurrency(slab.amount)} × ${slab.rate}% = ${this.formatCurrency(slab.tax)}
                    </div>
                `;
            });
            
            if (incomeTax.cess > 0) {
                html += `
                    <div class="tax-slab">
                        <strong>Health & Education Cess (4%)</strong><br>
                        ${this.formatCurrency(incomeTax.tax)} × 4% = ${this.formatCurrency(incomeTax.cess)}
                    </div>
                `;
            }
        }

        container.innerHTML = html;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    showError(message) {
        alert(message); // In a production app, you'd want a better error display
    }
}

// Initialize the calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SalaryCalculator();
});

// Add some utility functions for enhanced UX
document.addEventListener('DOMContentLoaded', () => {
    // Add input validation and formatting
    const numericInputs = document.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !isNaN(this.value)) {
                // Format large numbers with commas for better readability
                if (this.id === 'ctc' || this.id === 'section80c' || this.id === 'section80d' || this.id === 'hra') {
                    this.setAttribute('data-formatted', new Intl.NumberFormat('en-IN').format(this.value));
                }
            }
        });

        input.addEventListener('focus', function() {
            // Remove formatting when focused for editing
            this.removeAttribute('data-formatted');
        });
    });

    // Add tooltips for better UX
    const tooltips = [
        { id: 'section80c', text: 'PF, PPF, ELSS, Life Insurance, Home Loan Principal, etc.' },
        { id: 'section80d', text: 'Health Insurance Premium for self, family, and parents' },
        { id: 'hra', text: 'Annual HRA received that you want to claim exemption for' }
    ];

    tooltips.forEach(tooltip => {
        const element = document.getElementById(tooltip.id);
        if (element) {
            element.setAttribute('data-tooltip', tooltip.text);
            element.classList.add('tooltip');
        }
    });
});
