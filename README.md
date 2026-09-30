# Regression Playground

An interactive, single-file app for learning simple linear regression. Move the sliders and watch the descriptive statistics, the fitted line, the sum-of-squares split, R², F and the p-value update together.

**Live app:** https://bobaba99.github.io/regression-playground/

## What you can do
- Generate data (sample size, true slope, noise, spread and mean of X, intercept) and see the least-squares line and residuals.
- Rescale or shift X and Y after the fact to see what changes (b₁, b₀) and what doesn't (r, R², F).
- Read every formula with your current numbers substituted. Numbers turn green when they go up and red when they go down, and glow when they just changed.
- Pin a baseline to see "was …" values beside the new ones.
- Nudge the slope away from the best fit to see SS_res climb the parabola, with its derivative.
- Compare the theoretical F distribution with a permutation test (2,000 shuffles).

## Run locally
Open `index.html` in a browser. KaTeX is loaded from a CDN, so the first load needs an internet connection.
