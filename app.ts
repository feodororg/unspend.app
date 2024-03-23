const loadFromLocalStorage = (key: string, defaultValue: any) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
}

const saveToLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const periods = [
    "once",
    "daily",
    "weekly",
    "monthly",
    "yearly",
] as const;


const currencies = [
    "EUR",
    "USD",
    "RUB",
    "GBP",
    "RSD",
    "AMD",
    "GEL",
    "TYR",
    "KZT",
    "THB",
    "AED",
    "SAR",
] as const;

const defaultCurrency = "EUR";

const defaultUsedCurrencies = [
    "EUR",
    "USD",
    "RUB",
];

const currencyConversion: Record<Currency, number> = {
    EUR: 1,
    USD: 1.086,
    RSD: 117.2,
    RUB: 100.24,
    AMD: 430.92,
    GEL: 2.94,
    TYR: 34.77,
    KZT: 487.24,
    AED: 3.99,
    SAR: 4.07,
    THB: 39.40,
    GBP: 0.86,
};

type Period = (typeof periods)[number];
type Currency = (typeof currencies)[number];

let usedCurrencies: Currency[] = loadFromLocalStorage(
    "usedCurrencies",
    defaultUsedCurrencies,
);

let switchFromCurrency: Currency | null = null;

let selectedCurrency: Currency = defaultCurrency;

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

type ByCurrency = {
    [x in Currency]: number;
};

const NUM = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const roundToDecimals = (value: number, decimals: number): number =>
    Math.round(value * 10 ** decimals) / 10 ** decimals;

const round = (value: number): number => roundToDecimals(value, 2);

const parseDecimal = (value: string): number => {
    return parseFloat(value.replace(/,/g, "."))
};

const annualizeAmount = ({ period, amount }: AmountWithPeriod): number =>
    amount * periodMultiplier[period];

const convertToCurrency =
    ({ currency, amount, targetCurrency = defaultCurrency }): number =>
        targetCurrency === defaultCurrency
            ? amount / currencyConversion[currency]
            : amount / currencyConversion[currency] * currencyConversion[targetCurrency];

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


const calculateByCurrency = ({ currency, amount }): Record<string, number> => {
    const dafaultCurrencyAmount = convertToCurrency({ currency, amount });

    let results = {} as ByCurrency;

    currencies.forEach((currency) => {
        results[currency] = round(dafaultCurrencyAmount * currencyConversion[currency]);
    });

    results[currency] = amount;

    return results as ByCurrency;
};



const updateSwitcher = (results: Record<string, number>, switcherName) => {
    Object.entries(results).forEach(([key, amount]) => {
        const element = window.document.querySelector(
            `#switcher-${switcherName} label.${key} .amount`,
        );

        if (!element) {
            return;
        }

        element.innerHTML = NUM.format(amount);
    });
};

const toggleClassname = (classname: string) => (e) => e.target.parentElement.classList.toggle(classname);

const renderSwitcher = ({
    switcherName,
    switcherTitle,
    options,
    defaultOption = options[0],
}) => {
    let html = `<h2 class="switcher-title">${switcherTitle}</h2>
        <section id="switcher-${switcherName}" class="switcher ${switcherName}">`;


    options.forEach((option) => {
        const unused = switcherName === "currency"
            ? usedCurrencies.includes(option) ? "" : "unused"
            : "";

        html += `
            <label class="${option} ${unused}" data-option="${option}">
                <input type="radio" class="recalc ${option}" name="${switcherName}" value="${option}" ${option === defaultOption ? "checked" : ""
            } />
                <span class="label">${option}</span>
                <span class="convert"> ← </span>
                <span class="toggle">
                </span>
                <span class="amount">0</span>
            </label>
        `;
    });

    html += `</section>`;
    html += `<span class="toggle-settings">Settings</span>`;

    return html;
};

const mountSwitcher = ({
    switcherName,
    switcherTitle,
    options,
    defaultOption = options[0],
    recalcCallback,
}) => {
    const switcherElement = window.document.getElementById(switcherName);

    if (!switcherElement) return;

    switcherElement.innerHTML = renderSwitcher({
        switcherName,
        switcherTitle,
        options,
        defaultOption,
    });

    Array.from(window.document.getElementsByClassName("recalc")).forEach((element) => {
        element.addEventListener("input", recalcCallback);
    });


    Array.from(window.document.getElementsByClassName("switcher-title")).forEach((element) => {
        element.addEventListener("click", toggleClassname("hidden"));
    });

    Array.from(window.document.getElementsByClassName("toggle-settings")).forEach((element) => {
        element.addEventListener("click", toggleClassname("settings"));
    });

    Array.from(window.document.getElementsByClassName("toggle")).forEach((element) => {
        element.addEventListener("click", (e) => {
            const toggledCurrency = (e?.target as HTMLElement)?.parentElement?.getAttribute('data-option') as Currency;

            if (usedCurrencies.includes(toggledCurrency)) {
                usedCurrencies = usedCurrencies.filter(currency => currency !== toggledCurrency);
            } else {
                usedCurrencies.push(toggledCurrency);
            }
            saveToLocalStorage("usedCurrencies", usedCurrencies);
            toggleClassname("unused")(e);
        });
    });
};


const recalcForm = (event: Event) => {

    event.preventDefault();

    const currency = (window.document.querySelector(
        'input[name="currency"]:checked'
    ) as HTMLInputElement)?.value;

    selectedCurrency = currency as Currency;



    let price = (window.document.querySelector("input.amount") as HTMLInputElement)?.value;

    if (switchFromCurrency && price) {
        price = round(convertToCurrency({ currency: switchFromCurrency, targetCurrency: selectedCurrency, amount: parseDecimal(price) })).toString();
        (window.document.querySelector("input.amount") as HTMLInputElement).value = price;
    }

    switchFromCurrency = null;

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

    updateSwitcher(results, "period");

    const currencyResults = calculateByCurrency({ currency: currency as Currency, amount });


    updateSwitcher(currencyResults, "currency");
};

mountSwitcher({
    switcherName: "period",
    switcherTitle: "Period",
    options: periods,
    defaultOption: defaultPeriod,
    recalcCallback: recalcForm,
});

mountSwitcher({
    switcherName: "currency",
    switcherTitle: "Select or convert currency",
    options: currencies,
    defaultOption: defaultCurrency,
    recalcCallback: recalcForm,
});


Array.from(window.document.getElementsByClassName("convert")).forEach((element) => {
    element.addEventListener("click", (e) => {
        switchFromCurrency = selectedCurrency;
    });
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