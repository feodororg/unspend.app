const periods = [
    "once",
    "daily",
    "weekly",
    "monthly",
    "yearly",
] as const;

type Period = (typeof periods)[number];

const periodMultiplier: Record<Period, number> = {
    once: 1,
    daily: 366,
    weekly: 366 / 7,
    monthly: 12,
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

const parseDecimal = (value: string): number => {
    console.log({value, chars: value.split('').map(char => char.charCodeAt(0)), parsed: parseFloat(value.replace(/,/g, "."))})
    return   parseFloat(value.replace(/,/g, "."))
};

const annualizeAmount = ({ period, amount }: AmountWithPeriod): number =>
    amount * periodMultiplier[period];

const amountOnce = (amount: number) => periods.reduce((acc, period) => {
    acc[period] = amount;
    return acc;
}, {} as ByPeriod);

const calculateByPeriod = ({ period, amount }: AmountWithPeriod): ByPeriod => {
    if (period === 'once') return amountOnce(amount);

    const annualizedAmount = annualizeAmount({ period, amount });

    let results = {} as ByPeriod;

    periods.forEach((p) => {
        results[p] = Math.round(annualizedAmount / periodMultiplier[p]);
    });

    results[period] = amount;
    results.once = amount;
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
                <input type="radio" class="recalc ${period}" name="period" value="${period}" ${period === defaultPeriod ? "checked" : ""
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

    const price = (window.document.querySelector("input.amount") as HTMLInputElement)?.value;

    const count = (window.document.querySelector("input.count") as HTMLInputElement)?.value;

    const amount = parseDecimal(price) * (parseDecimal(count) || 1) || 0;

    const period = (window.document.querySelector(
        'input[name="period"]:checked'
    ) as HTMLInputElement)?.value;

    const withPeriod = {
        amount,
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

Array.from(window.document.getElementsByClassName("recalc")).forEach((element) => {
    element.addEventListener("input", recalcForm);
});

const preventDefault = (event: Event) => {
    event.preventDefault();
}

Array.from(window.document.getElementsByClassName("number")).forEach((element) => {
    element.addEventListener("focus", (e) => {
        e.preventDefault();

        element.addEventListener("contextmenu", preventDefault);
        (element as HTMLInputElement)?.select();

        setTimeout(() => element.removeEventListener("contextmenu", preventDefault), 200);
    });
});

if ((window.navigator as any)?.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches) {
    window.document.body.classList.add("standalone");
}