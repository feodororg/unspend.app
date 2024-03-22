const periods = [
    "daily",
    "biweekly",
    "weekly",
    "bimonthly",
    "monthly",
    "quarterly",
    "biyearly",
    "yearly",
] as const;

type Period = (typeof periods)[number];

const periodMultiplier: Record<Period, number> = {
    daily: 366,
    biweekly: (366 / 7) * 2,
    weekly: 366 / 7,
    bimonthly: 24,
    monthly: 12,
    quarterly: 4,
    biyearly: 2,
    yearly: 1,
};

const defaultPeriod = "daily";

type Amount = {
    amount: number;
};

type WithPeriod = {
    period: Period;
};

type AmountWithPeriod = Amount & WithPeriod;

type ByPeriod = {
    [x in Period]: number;
};

const NUM = new Intl.NumberFormat();

const annualizeAmount = ({ period, amount }: AmountWithPeriod): number =>
    amount * periodMultiplier[period];

const calculateByPeriod = ({ period, amount }: AmountWithPeriod): ByPeriod => {
    const annualizedAmount = annualizeAmount({ period, amount });

    let results = {} as ByPeriod;

    periods.forEach((p) => {
        results[p] = Math.round(annualizedAmount / periodMultiplier[p]);
    });

    results[period] = amount;
    results.yearly = annualizedAmount;

    return results as ByPeriod;
};

const displayResults = (results: ByPeriod, resultsElement) => {
    Object.entries(results).forEach(([period, amount]) => {
        const element = resultsElement.querySelector(`label.${period} .amount`);

        if (!element) {
            return;
        }

        element.innerHTML = NUM.format(Math.round(amount));
    });
};

const renderPeriods = () => {
    let html = "";

    periods.forEach((period) => {
        html += `
            <label class="${period}">
                <input type="radio" class="${period}" name="period" value="${period}" ${period === defaultPeriod ? "checked" : ""
            } />
                <span class="label">${period}</span>
                <span class="amount">0</span>
            </label>
        `;
    });

    return html;
};

const recalcForm = (event: Event) => {
    event.preventDefault();

    const amount = (window.document.querySelector("input.amount") as HTMLInputElement)?.value;
    const period = (window.document.querySelector(
        'input[name="period"]:checked'
    ) as HTMLInputElement)?.value;

    const withPeriod = {
        amount: parseFloat(amount) || 0,
        period: period as Period,
    };

    const results = calculateByPeriod(withPeriod);
    const resultsElement = window.document.getElementById("periods");
    displayResults(results, resultsElement);
};

const periodsElement = window.document.getElementById(`periods`);

if (periodsElement) {
    periodsElement.innerHTML = renderPeriods();
}

window.document
    ?.querySelector("input.amount")
    ?.addEventListener("input", recalcForm);

window.document.getElementsByName("period").forEach((radio) => {
    radio.addEventListener("change", recalcForm);
});
