# Sales Report Generator

Run one command and get today’s exchange rates for the currencies you care about, with the change over the last 7 days, as a readable report plus a CSV. If the service is down, it tells you clearly instead of crashing.

## Example Output

```text
=== Exchange Rate Report ===

Base: USD, rates from 2026-11-03

Current rates:
  1 USD = 0.89453 EUR
  1 USD = 0.74567 GBP
  1 USD = 158.29 JPY

Trend:
  EUR: 0.89453 (0.32% since 2026-10-20)
  GBP: 0.74567 (-0.48% since 2026-10-20)
  JPY: 158.29 (0.10% since 2026-10-20)

```
## Requirements

Node.js 18 or newer

Use to check your Node.js version:

```powershell
node --version
```
## How to run

1. Download rates.js
2. In a terminal, in that folder, run:

```powershell
node rates.js
```

If you wanna use your own currency you need:

```powershell
node rates.js --base "Your currency" --to "The currency you want the rate for" --days "amount of days you wanna scout for the %" --output "rates_report.txt"
```

## What you get:
 
 - 'rates-report.txt' (or the name you chose): the summery
 - 'rates-history': the change of the rate over 7 days

 ## Error Handlign

 - **Timeout**: server didnt react in 10s
 - **404**: false currency code input
 - **500**: server has problems

 ## Limitations and Data source

- Rates only exist for working days
- Referece rates and not trading prices
- data limited to Frankfurter API