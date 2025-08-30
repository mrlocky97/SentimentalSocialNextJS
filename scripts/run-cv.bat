@echo off
:: Script to run k-fold cross-validation for sentiment analysis model

:: Set default values
set KFOLD=%1
if "%KFOLD%"=="" set KFOLD=5

set EVAL_MODE=CROSS_VALIDATION

set RANDOM_SEED=%2
if "%RANDOM_SEED%"=="" set RANDOM_SEED=42

echo 🧪 Running %KFOLD%-fold cross-validation with seed %RANDOM_SEED%...

:: Run the training script with appropriate environment variables
set EVAL_MODE=%EVAL_MODE%
set KFOLD=%KFOLD%
set RANDOM_SEED=%RANDOM_SEED%
npx tsx scripts/train-model-kfold.ts

echo ✅ Cross-validation complete. Check data/model-metadata.json for results.
echo 📊 You can also view the results at the API endpoint: GET /metrics/cv
